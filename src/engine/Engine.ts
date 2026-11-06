import { Vector2, WebGLRenderer, type Object3D, type Scene } from 'three';
import type { StageId } from '../state/appStore';
import { PerformanceMonitor, QualityGovernor } from './quality/PerformanceMonitor';
import {
  ambientPolicyFor,
  detectQualityTier,
  higherTier,
  isBelow,
  isMobileDevice,
  isSoftwareRenderer,
  lowerTier,
  readDeviceSignals,
  settingsForTier,
  type QualitySettings,
  type QualityTier,
} from './quality/qualityTier';
import type { SnapshotSlot } from './render/FrameSnapshots';
import { LookPipeline, type TransitionFrame } from './render/LookPipeline';
import type { Stage, StageHost } from './stage/Stage';
import { StageManager } from './stage/StageManager';
import { stageLoaders } from './stages';
import { yieldToMain } from './utils/yieldToMain';
import { sampleFor, secondsFor, swapAtFor, type TransitionMode, type TransitionSample } from './transition/timeline';

/** The globe intro lasts 1.6 s; the first-load tier ramp waits this long after the first frame. */
const INTRO_RAMP_MS = 1800;

/** Render scale tried before a tier drop. */
const SOFT_RENDER_SCALE = 0.85;

/**
 * One trip between two stages. `progress` runs 0..1 from `from` to `to`; `direction` says where it is heading now, so
 * turning back mid-way is only flipping it.
 */
interface TransitionTween {
  from: StageId;
  to: StageId;
  mode: TransitionMode;
  progress: number;
  direction: 1 | -1;
  /** The first frame of a trip only draws (and captures) the stage it leaves: the swap needs a frame to snapshot. */
  primed: boolean;
  /** A request for a third stage: the trip returns to the globe (or the nearest end) and then starts that one. */
  queued: StageId | null;
}

interface Waiter {
  target: StageId;
  resolve: (completed: boolean) => void;
}

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  /** Forces a tier and disables the adaptive governor (used by tests and `?quality=`). */
  tierOverride?: QualityTier;
  /** Overrides the seconds of inactivity after which ambient animation pauses (tests and `?ambientIdle=`). */
  ambientIdleSeconds?: number;
}

/**
 * The only WebGLRenderer of the app. Renders on demand (only while something animates), pauses with the tab
 * hidden, survives context loss, and swaps stages with a fade.
 */
export class Engine {
  readonly renderer: WebGLRenderer;
  readonly manager: StageManager;
  framesRendered = 0;

  private readonly canvas: HTMLCanvasElement;
  private readonly pipeline: LookPipeline;
  private readonly monitor = new PerformanceMonitor();
  private readonly governor = new QualityGovernor();
  private readonly mobile: boolean;
  private readonly ambientIdleSeconds: number | undefined;
  private readonly tierLocked: boolean;
  /** Best tier the governor may climb back to: the detected one, lowered when a climb did not hold. */
  private tierCeiling: QualityTier;
  /** The last change was a climb: if it drops again, the ceiling stays below it. */
  private climbed = false;
  private quality: QualitySettings;
  /** Mobile first paint: the intro runs at the low tier and this is the tier it climbs to once the intro is over (null = no ramp pending). */
  private introRampTier: QualityTier | null = null;
  private introRampAt = 0;
  private readonly transition: TransitionFrame = {
    capture: null,
    overlay: null,
    opacity: 0,
    scale: 1,
    center: new Vector2(0.5, 0.5),
    reveal: 0,
    revealInside: false,
    blur: 0,
  };
  /** Snapshot of the stage the trip left, drawn over the arriving one; null while the leaving stage is still on screen. */
  private snapshotSlot: SnapshotSlot | null = null;
  /** Slot the newest frame of the stage on screen is copied into. */
  private captureSlot: SnapshotSlot = 0;
  private readonly snapshotAnchor = new Vector2(0.5, 0.5);
  private tween: TransitionTween | null = null;
  /** Debug scrubber (`?scrub`): 0 freezes the trip, 1 is real speed. */
  private tripTimeScale = 1;
  /** Debug scrubber: progress to jump to on the next frame, through the same swap and hold rules. */
  private scrubTo: number | null = null;
  private waiter: Waiter | null = null;
  private selectListener: ((id: string) => void) | null = null;
  private frameRequest = 0;
  private lastFrameAt = 0;
  private contextLost = false;
  private disposed = false;
  private readonly resizeObserver: ResizeObserver;
  private readonly touchDevice = window.matchMedia('(pointer: coarse)').matches;
  private lastWidth = 0;
  private readonly cleanups: Array<() => void> = [];

  constructor({ canvas, tierOverride, ambientIdleSeconds }: EngineOptions) {
    this.canvas = canvas;
    this.ambientIdleSeconds = ambientIdleSeconds;
    const signals = readDeviceSignals();
    this.mobile = isMobileDevice(signals);
    this.tierLocked = tierOverride !== undefined;

    this.renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    const detected = isSoftwareRenderer(this.renderer.getContext()) ? 'low' : detectQualityTier(signals);
    this.tierCeiling = tierOverride ?? detected;
    // The intro is the heaviest stretch of the first load: on a phone it starts cheap and the real tier comes after it.
    if (this.mobile && !this.tierLocked && this.tierCeiling !== 'low') this.introRampTier = this.tierCeiling;
    this.quality = settingsForTier(this.introRampTier ? 'low' : this.tierCeiling, this.mobile);
    // Shader error logs (getProgramInfoLog and friends) force a synchronous link wait: dev only.
    this.renderer.debug.checkShaderErrors = import.meta.env.DEV;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.maxPixelRatio));
    // On once for the whole app: stages that light with shadows compile with it, and the globe has no shadow light to pay for.
    this.renderer.shadowMap.enabled = true;
    this.pipeline = new LookPipeline(this.renderer, this.quality);

    const host: StageHost = {
      canvas,
      invalidate: () => this.invalidate(),
      ambient: () => {
        const policy = ambientPolicyFor(this.introRampTier ?? this.quality.tier, this.mobile);
        return this.ambientIdleSeconds === undefined ? policy : { ...policy, idleSeconds: this.ambientIdleSeconds };
      },
      tier: () => this.introRampTier ?? this.quality.tier,
      pixelRatio: () => this.renderer.getPixelRatio() * this.quality.renderScale,
      useStaticShadows: (enabled) => {
        this.renderer.shadowMap.autoUpdate = !enabled;
        this.renderer.shadowMap.needsUpdate = enabled;
      },
      refreshShadows: () => {
        this.renderer.shadowMap.needsUpdate = true;
        this.invalidate();
      },
      select: (id) => this.selectListener?.(id),
      compile: (stage) => this.prepareForScreen(stage),
    };
    this.manager = new StageManager(stageLoaders, host, this.quality.maxWarmStages);
    this.manager.pin('globe'); // the hub is always one click (or Back) away: it never sleeps

    this.resizeObserver = new ResizeObserver(() => this.applySize());
    this.resizeObserver.observe(canvas);
    this.listen(canvas, 'webglcontextlost', this.onContextLost);
    this.listen(canvas, 'webglcontextrestored', this.onContextRestored);
    this.listen(document, 'visibilitychange', this.onVisibilityChange);
    this.watchDevicePixelRatio();
    this.applySize();
  }

  get tier(): QualityTier {
    return this.quality.tier;
  }

  get pixelRatio(): number {
    return this.renderer.getPixelRatio();
  }

  get memory() {
    return { ...this.renderer.info.memory };
  }

  /** First stage: no fade. */
  async start(initial: StageId) {
    const stage = await this.manager.activate(initial);
    this.showStage(stage);
  }

  /**
   * Goes to a stage. From the globe into a city (and back) the camera crosses the halo; otherwise it is a plain fade.
   * Resolves false if a newer request superseded this one. A request made mid-way turns the trip around from where it is.
   * `instant` swaps with no trip (when nothing is travelling); a trip already under way ignores it.
   */
  goTo(target: StageId, instant = false): Promise<boolean> {
    if (this.disposed) return Promise.resolve(false);
    this.waiter?.resolve(false);
    const result = new Promise<boolean>((resolve) => {
      this.waiter = { target, resolve };
    });
    this.steerTo(target, instant);
    return result;
  }

  /** Scroll story progress, forwarded to the stage on screen (it ignores it if it has no story). */
  /** Listener for the parts of a monument the visitor taps (see `StageHost.select`). */
  onSelect(listener: ((id: string) => void) | null) {
    this.selectListener = listener;
  }

  /** Explore chapter: view and highlighted part, forwarded to the stage on screen. */
  setExplore(view: string | null, part: string | null) {
    this.manager.active?.setExplore?.(view, part);
  }

  setStory(chapter: number, t: number) {
    this.manager.active?.setStory?.(chapter, t);
  }

  /** Interest, not commitment (hover): warms the stage only if that does not put another one to sleep. */
  preload(id: StageId) {
    return this.manager.preload(id, { speculative: true });
  }

  /** Asks for one more frame (render on demand). */
  invalidate() {
    if (this.frameRequest || this.disposed || this.contextLost || document.hidden) return;
    this.frameRequest = requestAnimationFrame(this.frame);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameRequest);
    this.waiter?.resolve(false);
    this.waiter = null;
    this.cleanups.forEach((cleanup) => cleanup());
    this.resizeObserver.disconnect();
    this.manager.disposeAll();
    this.pipeline.dispose();
    this.renderer.dispose();
  }

  /** Compiles the shaders and then draws the stage once off screen, so the swap frame of a trip has nothing left to upload. */
  private async prepareForScreen(stage: Stage) {
    await this.renderer.compileAsync(stage.scene, stage.camera);
    await yieldToMain();
    if (this.disposed || this.contextLost) return;
    // First stage: nothing to swap yet, and its first real frame uploads everything anyway. Warming it would be the same work twice.
    if (!this.manager.active) return;
    const { shadowMap } = this.renderer;
    const pendingShadowUpdate = shadowMap.needsUpdate;
    // Draw this stage's own shadow map even if the stage on screen keeps its shadows static.
    shadowMap.needsUpdate = true;
    // Real aspect first: with the default one, frustum culling would skip objects that then upload at the swap.
    stage.resize(this.aspect());
    const restoreHidden = revealHidden(stage.scene);
    try {
      this.pipeline.warm(stage.scene, stage.camera, stage.look);
    } finally {
      restoreHidden();
    }
    shadowMap.needsUpdate = pendingShadowUpdate;
  }

  private steerTo(target: StageId, instant: boolean) {
    const tween = this.tween;
    if (!tween) {
      const shown = this.manager.active?.id;
      if (!shown || shown === target) return this.settleWaiter(shown);
      if (instant) return void this.jumpTo(target);
      return this.beginTrip(shown, target);
    }
    tween.queued = null;
    if (target === tween.from) tween.direction = -1;
    else if (target === tween.to) tween.direction = 1;
    else {
      // A third stage waits for the trip to get back to the globe (or the nearest end).
      tween.queued = target;
      const towardGlobe = tween.to === 'globe' ? 1 : -1;
      tween.direction = tween.mode === 'fade' ? (tween.progress < 0.5 ? -1 : 1) : towardGlobe;
    }
    this.preloadFor(tween.direction === 1 ? tween.to : tween.from);
    this.invalidate();
  }

  private beginTrip(shown: StageId, target: StageId) {
    this.preloadFor(target);
    if (document.hidden) return void this.jumpTo(target);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const touchesGlobe = shown === 'globe' || target === 'globe';
    if (reduced || !touchesGlobe) {
      this.tween = { from: shown, to: target, mode: 'fade', progress: 0, direction: 1, primed: false, queued: null };
    } else {
      const mode = shown === 'globe' ? 'enter' : 'exit';
      this.tween = { from: shown, to: target, mode, progress: 0, direction: 1, primed: false, queued: null };
    }
    this.captureSlot = 0;
    this.snapshotSlot = null;
    this.invalidate();
  }

  /** Swaps without animation (hidden tab, or a back gesture that already animated). The stage arrives at rest, as a trip would leave it. */
  private async jumpTo(target: StageId) {
    const from = this.manager.active?.id;
    try {
      const stage = await this.manager.activate(target);
      if (from && from !== target) {
        if (target === 'globe') stage.restFor?.(from);
        stage.setExit?.(0, from);
        stage.setEntry?.(1, from);
      }
      this.showStage(stage);
    } catch (error) {
      console.error(`Could not load the "${target}" scene.`, error);
    }
    this.settleWaiter(this.manager.active?.id);
  }

  private preloadFor(id: StageId) {
    if (this.manager.isReady(id)) return;
    this.manager.preload(id).catch((error) => this.onPreloadFailed(id, error));
  }

  private onPreloadFailed(id: StageId, error: unknown) {
    console.error(`Could not load the "${id}" scene.`, error);
    const tween = this.tween;
    if (!tween || (id !== tween.from && id !== tween.to)) return;
    // Head back to the end that did load.
    tween.queued = null;
    tween.direction = id === tween.to ? -1 : 1;
    this.invalidate();
  }

  /** Answers the pending request: true if the stage it wanted is the one on screen. */
  private settleWaiter(shown: StageId | undefined) {
    const waiter = this.waiter;
    if (!waiter) return;
    this.waiter = null;
    waiter.resolve(shown === waiter.target);
  }

  private showStage(stage: Stage) {
    stage.resize(this.aspect());
    this.invalidate();
  }

  private aspect(): number {
    return Math.max(this.canvas.clientWidth, 1) / Math.max(this.canvas.clientHeight, 1);
  }

  /** Stage that should be on screen at this progress. */
  private stageAt(tween: TransitionTween, progress: number): StageId {
    return progress < swapAtFor(tween.mode) ? tween.from : tween.to;
  }

  /** Debug scrubber: trip speed (0 freezes it). */
  setTripTimeScale(scale: number) {
    this.tripTimeScale = Math.max(0, scale);
    this.invalidate();
  }

  /** Debug scrubber: puts the current trip at `progress` (0 = from, 1 = to). */
  scrubTrip(progress: number) {
    if (!this.tween) return;
    this.scrubTo = progress;
    this.invalidate();
  }

  /** Debug scrubber: where the current trip is, and what each layer of the transition is doing there. */
  tripState() {
    const tween = this.tween;
    if (!tween) return null;
    return {
      from: tween.from,
      to: tween.to,
      mode: tween.mode,
      progress: tween.progress,
      sample: sampleFor(tween.mode, tween.progress),
      anchor: { x: this.snapshotAnchor.x, y: this.snapshotAnchor.y },
    };
  }

  /** Moves the trip forward one frame. Returns true while it still needs frames. */
  private advanceTrip(delta: number): boolean {
    const tween = this.tween;
    if (!tween) return false;

    // Entering: the dive does not start until the city is ready, so the visible frames never carry its loading work.
    const waitingForCity = tween.mode === 'enter' && tween.direction === 1 && tween.progress === 0 && !this.manager.isReady(tween.to);
    const step = tween.primed && !waitingForCity ? (tween.direction * delta * this.tripTimeScale) / secondsFor(tween.mode) : 0;
    tween.primed = true;
    let next = Math.min(1, Math.max(0, this.scrubTo ?? tween.progress + step));
    this.scrubTo = null;

    const wanted = this.stageAt(tween, next);
    if (wanted !== this.manager.active?.id) {
      const stage = this.manager.activateIfReady(wanted);
      if (!stage) {
        // Not loaded yet: hold at the swap point, still showing the last frame of the leaving stage, until it is.
        const swapAt = swapAtFor(tween.mode);
        next = tween.direction === 1 ? Math.min(next, swapAt - 1e-6) : Math.max(next, swapAt);
        this.preloadFor(wanted);
      } else {
        this.keepSnapshotFor(tween, wanted);
        stage.resize(this.aspect());
        // Leaving a city: the globe arrives already turned to it, as if it had dived into it and settled.
        if (tween.mode === 'exit' && wanted === tween.to) stage.restFor?.(tween.from);
        this.monitor.reset();
      }
    }
    tween.progress = next;

    const sample = sampleFor(tween.mode, next);
    this.driveStages(tween, sample);
    this.paintTransition(tween, sample);

    // Frozen by the scrubber: keep the trip open at any progress, and only redraw when it moves.
    if (this.tripTimeScale === 0) return false;
    const arrived = tween.direction === 1 ? next >= 1 : next <= 0;
    if (!arrived) return true;
    this.endTrip(tween);
    return this.tween !== null;
  }

  /**
   * Stages just swapped. Reaching the destination keeps the last frame of the one that left (the newest capture) to draw over
   * it; going back to the start frees that slot. The anchor is where the snapshot scales from: the city on the globe when
   * entering, the middle of the screen otherwise.
   */
  private keepSnapshotFor(tween: TransitionTween, shown: StageId) {
    if (shown !== tween.to) {
      this.captureSlot = this.snapshotSlot ?? 0;
      this.snapshotSlot = null;
      return;
    }
    this.snapshotSlot = this.captureSlot;
    this.captureSlot = this.snapshotSlot === 0 ? 1 : 0;
    const anchor = tween.mode === 'enter' ? this.manager.get('globe')?.transitionAnchor?.(tween.to) : undefined;
    this.snapshotAnchor.set(anchor?.centerX ?? 0.5, anchor?.centerY ?? 0.5);
  }

  /** Tells the stage on screen how far it is from rest, as the leaving or the arriving one. */
  private driveStages(tween: TransitionTween, sample: TransitionSample) {
    const stage = this.manager.active;
    if (!stage) return;
    const other = stage.id === tween.from ? tween.to : tween.from;
    // How far this stage is from its rest: the globe by the camera dive, a city by how new it is.
    const away = tween.mode === 'fade' ? 0 : stage.id === 'globe' ? sample.zoom : sample.cityAway;
    if (stage.id === tween.from) stage.setExit?.(away, other);
    else stage.setEntry?.(1 - away, other);
  }

  private paintTransition(tween: TransitionTween, sample: TransitionSample) {
    const { transition } = this;
    const { mode } = tween;
    transition.capture = this.captureSlot;
    transition.overlay = this.snapshotSlot;
    // Entering or leaving the snapshot stays opaque and a circle cuts it; a fade dissolves it.
    transition.opacity = mode === 'fade' ? 1 - sample.mix : 1;
    transition.reveal = sample.reveal;
    transition.revealInside = mode === 'exit';
    transition.blur = sample.blur;
    transition.scale = sample.snapScale;
    // Leaving a city the circle follows it on the live globe as the camera pulls back.
    const anchor = mode === 'exit' && this.snapshotSlot !== null ? this.manager.get('globe')?.transitionAnchor?.(tween.from) : undefined;
    if (anchor) this.snapshotAnchor.set(anchor.centerX, anchor.centerY);
    transition.center.copy(this.snapshotAnchor);
  }

  /** The trip reached one of its ends: settle the stage there, drop the snapshot, and answer or start the queued one. */
  private endTrip(tween: TransitionTween) {
    this.tween = null;
    const shown = tween.direction === 1 ? tween.to : tween.from;
    const other = shown === tween.to ? tween.from : tween.to;
    // Whatever way it ended, the stage on screen is at rest.
    const stage = this.manager.active;
    stage?.setExit?.(0, other);
    stage?.setEntry?.(1, other);
    this.snapshotSlot = null;
    Object.assign(this.transition, { capture: null, overlay: null, opacity: 0, scale: 1, reveal: 0, revealInside: false, blur: 0 });

    if (tween.queued && tween.queued !== shown) return this.beginTrip(shown, tween.queued);
    this.settleWaiter(shown);
  }

  private readonly frame = (now: number) => {
    this.frameRequest = 0;
    const stage = this.manager.active;
    if (!stage || this.disposed || this.contextLost || document.hidden) return;

    const continuous = this.lastFrameAt !== 0;
    const delta = continuous ? Math.min((now - this.lastFrameAt) / 1000, 0.1) : 1 / 60;
    this.lastFrameAt = now;
    this.climbAfterIntro(now);
    const tripAnimating = this.advanceTrip(delta);
    // The trip may have swapped stages: render the one on screen now.
    const shown = this.manager.active ?? stage;
    const stageAnimating = shown.update(delta);

    this.pipeline.render(shown.scene, shown.camera, shown.look, this.transition);
    this.framesRendered += 1;
    this.watchPerformance(now, continuous);

    if (stageAnimating || tripAnimating) this.invalidate();
    else this.lastFrameAt = 0;
  };

  /** Once the intro has played (and a trip has not started), the phone gets its detected tier back. */
  private climbAfterIntro(now: number) {
    if (!this.introRampTier) return;
    if (!this.introRampAt) this.introRampAt = now + INTRO_RAMP_MS;
    if (now < this.introRampAt && !this.tween) return;
    const tier = this.introRampTier;
    this.introRampTier = null;
    this.applyQuality(tier);
  }

  private watchPerformance(now: number, continuous: boolean) {
    const snapshot = this.monitor.recordFrame(now, continuous);
    // Swapping stages hitches on purpose (uploads, compiles): the governor must not read it as a slow device.
    if (!snapshot || this.tween || this.tierLocked || this.introRampTier) return;
    const verdict = this.governor.judge(snapshot);
    const { tier } = this.quality;
    if (verdict === 'floor' && tier !== 'low') {
      // A saturated GPU (another app): no time to try each step. The governor climbs back up when it frees.
      this.climbed = false;
      this.applyQuality('low');
    } else if (verdict === 'down' && tier !== 'low' && this.quality.renderScale > SOFT_RENDER_SCALE) {
      // Cheaper than a tier: a lighter render scale first. If frames do not improve the governor reads the cap.
      this.governor.noteSoftened(snapshot.frameMs);
      this.monitor.reset();
      this.quality = { ...this.quality, renderScale: SOFT_RENDER_SCALE };
      this.pipeline.setQuality(this.quality);
      this.applySize(true);
    } else if (verdict === 'down' && tier !== 'low') {
      // A climb that could not hold: stay below it from now on, so the quality does not swing back and forth.
      if (this.climbed) this.tierCeiling = lowerTier(tier);
      this.climbed = false;
      this.applyQuality(lowerTier(tier));
    } else if (verdict === 'up' && isBelow(tier, this.tierCeiling)) {
      this.climbed = true;
      this.applyQuality(higherTier(tier));
    }
  }

  private applyQuality(tier: QualityTier) {
    this.monitor.reset();
    this.governor.resetAll();
    this.quality = settingsForTier(tier, this.mobile);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.maxPixelRatio));
    this.manager.setMaxWarmStages(this.quality.maxWarmStages);
    this.pipeline.setQuality(this.quality);
    this.applySize(true);
  }

  private applySize(force = false) {
    if (this.disposed) return;
    // Touch browsers resize the viewport in height alone when the address bar shows or hides: not a real resize.
    const width = this.canvas.clientWidth;
    if (!force && this.touchDevice && width === this.lastWidth && this.lastWidth > 0) return;
    this.lastWidth = width;
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
    this.pipeline.resize();
    this.manager.active?.resize(this.aspect());
    this.invalidate();
  }

  /** Moving the window to a screen of another density (or zooming) changes the DPR without resizing the canvas. */
  private watchDevicePixelRatio() {
    const query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const onChange = () => {
      query.removeEventListener('change', onChange);
      if (this.disposed) return;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.maxPixelRatio));
      this.applySize(true);
      this.watchDevicePixelRatio();
    };
    query.addEventListener('change', onChange);
    this.cleanups.push(() => query.removeEventListener('change', onChange));
  }

  private readonly onContextLost = (event: Event) => {
    event.preventDefault();
    this.contextLost = true;
    cancelAnimationFrame(this.frameRequest);
    this.frameRequest = 0;
    this.monitor.reset();
  };

  private readonly onContextRestored = () => {
    this.contextLost = false;
    this.pipeline.resize();
    this.invalidate();
  };

  private readonly onVisibilityChange = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.frameRequest);
      this.frameRequest = 0;
      return;
    }
    this.lastFrameAt = 0;
    this.monitor.reset();
    this.invalidate();
  };

  private listen(target: EventTarget, type: string, handler: EventListener) {
    target.addEventListener(type, handler);
    this.cleanups.push(() => target.removeEventListener(type, handler));
  }
}

/**
 * Shows, for one warm-up draw, the objects that start hidden (the globe's arcs, shooting star and city dots) and stops them
 * from being culled. Otherwise their shaders compile the first time they appear, on the main thread, in the middle of the
 * visitor's first interactions. Returns the function that puts everything back.
 */
function revealHidden(scene: Scene): () => void {
  const undo: Array<() => void> = [];
  scene.traverse((object: Object3D) => {
    if (object.visible) return;
    const { frustumCulled } = object;
    object.visible = true;
    object.frustumCulled = false;
    undo.push(() => {
      object.visible = false;
      object.frustumCulled = frustumCulled;
    });
  });
  return () => undo.forEach((restore) => restore());
}
