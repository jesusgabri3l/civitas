import { Color, WebGLRenderer } from 'three';
import type { StageId } from '../state/appStore';
import { PerformanceMonitor, QualityGovernor } from './quality/PerformanceMonitor';
import {
  ambientPolicyFor,
  detectQualityTier,
  isMobileDevice,
  lowerTier,
  readDeviceSignals,
  settingsForTier,
  type QualitySettings,
  type QualityTier,
} from './quality/qualityTier';
import { LookPipeline, type FadeState } from './render/LookPipeline';
import type { Stage, StageHost } from './stage/Stage';
import { StageManager } from './stage/StageManager';
import { stageLoaders } from './stages';

const FADE_SECONDS = 0.26;
const FADE_COLOR = 0x0b0b0e;

interface FadeTween {
  from: number;
  to: number;
  startedAt: number | null;
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
  private quality: QualitySettings;
  private readonly fade: FadeState = { amount: 0, color: new Color(FADE_COLOR) };
  private tween: FadeTween | null = null;
  private frameRequest = 0;
  private lastFrameAt = 0;
  private contextLost = false;
  private disposed = false;
  private token = 0;
  private chain: Promise<unknown> = Promise.resolve();
  private readonly resizeObserver: ResizeObserver;
  private readonly cleanups: Array<() => void> = [];

  constructor({ canvas, tierOverride, ambientIdleSeconds }: EngineOptions) {
    this.canvas = canvas;
    this.ambientIdleSeconds = ambientIdleSeconds;
    const signals = readDeviceSignals();
    this.mobile = isMobileDevice(signals);
    this.tierLocked = tierOverride !== undefined;
    this.quality = settingsForTier(tierOverride ?? detectQualityTier(signals), this.mobile);

    this.renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.maxPixelRatio));
    this.pipeline = new LookPipeline(this.renderer, this.quality);

    const host: StageHost = {
      canvas,
      invalidate: () => this.invalidate(),
      ambient: () => {
        const policy = ambientPolicyFor(this.quality.tier, this.mobile);
        return this.ambientIdleSeconds === undefined ? policy : { ...policy, idleSeconds: this.ambientIdleSeconds };
      },
      tier: () => this.quality.tier,
      pixelRatio: () => this.renderer.getPixelRatio() * this.quality.renderScale,
      compile: (stage) => this.renderer.compileAsync(stage.scene, stage.camera).then(() => {}),
    };
    this.manager = new StageManager(stageLoaders, host, this.quality.maxWarmStages);

    this.resizeObserver = new ResizeObserver(() => this.applySize());
    this.resizeObserver.observe(canvas);
    this.listen(canvas, 'webglcontextlost', this.onContextLost);
    this.listen(canvas, 'webglcontextrestored', this.onContextRestored);
    this.listen(document, 'visibilitychange', this.onVisibilityChange);
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

  /** Swaps to a stage with a fade. Resolves false if a newer request superseded this one. Latest request wins. */
  goTo(target: StageId): Promise<boolean> {
    const token = ++this.token;
    const run = () => this.runSwap(target, token);
    const result = this.chain.then(run, run);
    this.chain = result.catch(() => {});
    return result;
  }

  preload(id: StageId) {
    return this.manager.preload(id);
  }

  /** Asks for one more frame (render on demand). */
  invalidate() {
    if (this.frameRequest || this.disposed || this.contextLost || document.hidden) return;
    this.frameRequest = requestAnimationFrame(this.frame);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameRequest);
    this.tween?.resolve(false);
    this.cleanups.forEach((cleanup) => cleanup());
    this.resizeObserver.disconnect();
    this.manager.disposeAll();
    this.pipeline.dispose();
    this.renderer.dispose();
  }

  private async runSwap(target: StageId, token: number): Promise<boolean> {
    if (this.disposed || token !== this.token) return false;
    if (this.manager.active?.id === target && this.fade.amount === 0) return true;

    const preparing = this.manager.preload(target);
    preparing.catch(() => {});
    await this.fadeTo(1);
    try {
      await preparing;
    } catch (error) {
      console.error(`Could not load the "${target}" scene.`, error);
      await this.fadeTo(0);
      return false;
    }
    if (token !== this.token) return false;

    this.showStage(await this.manager.activate(target));
    await this.fadeTo(0);
    return token === this.token;
  }

  private showStage(stage: Stage) {
    stage.resize(this.aspect());
    this.invalidate();
  }

  private aspect(): number {
    return Math.max(this.canvas.clientWidth, 1) / Math.max(this.canvas.clientHeight, 1);
  }

  private fadeTo(value: number): Promise<boolean> {
    this.tween?.resolve(false);
    this.tween = null;
    const instant = document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (instant || this.fade.amount === value) {
      this.fade.amount = value;
      this.invalidate();
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      this.tween = { from: this.fade.amount, to: value, startedAt: null, resolve };
      this.invalidate();
    });
  }

  /** Returns true while the fade still needs frames. */
  private advanceFade(now: number): boolean {
    const tween = this.tween;
    if (!tween) return false;
    tween.startedAt ??= now;
    const progress = Math.min((now - tween.startedAt) / (FADE_SECONDS * 1000), 1);
    this.fade.amount = tween.from + (tween.to - tween.from) * progress;
    if (progress < 1) return true;
    this.tween = null;
    tween.resolve(true);
    return false;
  }

  private readonly frame = (now: number) => {
    this.frameRequest = 0;
    const stage = this.manager.active;
    if (!stage || this.disposed || this.contextLost || document.hidden) return;

    const delta = this.lastFrameAt ? Math.min((now - this.lastFrameAt) / 1000, 0.1) : 1 / 60;
    this.lastFrameAt = now;
    const stageAnimating = stage.update(delta);
    const fadeAnimating = this.advanceFade(now);

    this.pipeline.render(stage.scene, stage.camera, stage.look, this.fade);
    this.framesRendered += 1;
    this.watchPerformance(now);

    if (stageAnimating || fadeAnimating) this.invalidate();
    else this.lastFrameAt = 0;
  };

  private watchPerformance(now: number) {
    const snapshot = this.monitor.recordFrame(now);
    if (!snapshot || this.tierLocked || this.quality.tier === 'low') return;
    if (this.governor.shouldDowngrade(snapshot)) this.applyQuality(lowerTier(this.quality.tier));
  }

  private applyQuality(tier: QualityTier) {
    this.quality = settingsForTier(tier, this.mobile);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.maxPixelRatio));
    this.manager.setMaxWarmStages(this.quality.maxWarmStages);
    this.pipeline.setQuality(this.quality);
    this.applySize();
  }

  private applySize() {
    if (this.disposed) return;
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
    this.pipeline.resize();
    this.manager.active?.resize(this.aspect());
    this.invalidate();
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
