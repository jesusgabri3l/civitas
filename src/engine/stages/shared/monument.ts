import {
  CanvasTexture,
  Color,
  DataTexture,
  DirectionalLight,
  Fog,
  HemisphereLight,
  MeshToonMaterial,
  NearestFilter,
  PerspectiveCamera,
  Raycaster,
  RedFormat,
  Scene,
  SpotLight,
  Vector2,
  Vector3,
  type Object3D,
} from 'three';
import type { DestinationId } from '../../../data/destinations';
import type { QualityTier } from '../../quality/qualityTier';
import { DEFAULT_PLASTER, type PlasterSettings } from '../../render/PlasterLook';
import type { Stage, StageHost, TransitionAnchor } from '../../stage/Stage';
import { disposeObject } from '../../utils/disposal';
import { yieldToMain } from '../../utils/yieldToMain';
import { BeamDust } from './BeamDust';
import { ContactShadow } from './ContactShadow';
import { Exhibit } from './Exhibit';
import { ExploreOrbit, type OrbitLimits } from './ExploreOrbit';
import { createSoftPoolCookie } from './proceduralSurfaces';
import { StoryCamera, type CameraTrack } from './StoryCamera';

/**
 * Everything around a maquette (docs/ART-DIRECTION.md §6): ground, fog, pedestal, one overhead spot with its beam and dust, fill and
 * rim, contact shadow and the look of the final pass. One per monument, in `stages/<city>/<city>Config.ts`.
 */
export interface MonumentEnvironment {
  /** Ground of the city (background and fog). Keep in sync with `$cities` in _variables.scss and `stageSky`. */
  backdrop: number;
  /** Room floor; the pedestal stands on it and its top is the base of the model. */
  floorY: number;
  fog: { near: number; far: number };
  floor: { color: number; roughness: number };
  /** `bevel`: worn edge radius in meters. */
  pedestal: { width: number; depth: number; height: number; color: number; bevel: number };
  /** Overhead spot. Positions in meters, `angle` in degrees, `penumbra` 0..1, `intensity` at the aim point. */
  spot: {
    position: [number, number, number];
    target: [number, number, number];
    angle: number;
    penumbra: number;
    intensity: number;
    color: number;
    softness: number;
    decay: number;
    /** A soft irregular cookie turns the floor patch into a pool of gallery light (needs shadows). */
    cookie: boolean;
  };
  /** Faint additive volume of the spot: `angle` of its cone in degrees (narrower than the lit area). */
  beam: { angle: number; opacity: number; color: number };
  fill: { sky: number; ground: number; intensity: number };
  /** Very faint back light that separates the model from the dark. */
  rim: { color: number; intensity: number; position: [number, number, number] } | null;
  contact: { opacity: number; width: number; depth: number } | null;
  /** Dust in the beam. */
  dust: { color: number; baseAlpha: number; size: number } | null;
  shadows: boolean;
  /** Far plane of the spot's shadow camera in meters (default 400): a tall monument needs the lamp further away. */
  shadowFar?: number;
  bias: number;
  normalBias: number;
  /** Final pass, merged over `DEFAULT_PLASTER` (ink outline, AO, grain, vignette...). */
  look: Partial<PlasterSettings>;
  /** Wide screens shift the image right by this share of the width (the text is on the left). */
  framingX: number;
}

/** Plaster in three flat bands (shadow, mid, light). One material for the whole maquette; tints go per instance. */
export function createToonPlaster(color: number, bands: readonly number[]) {
  const data = Uint8Array.from(bands.map((band) => Math.round(band * 255)));
  const gradient = new DataTexture(data, data.length, 1, RedFormat);
  gradient.minFilter = gradient.magFilter = NearestFilter;
  gradient.needsUpdate = true;
  const material = new MeshToonMaterial({ color, gradientMap: gradient });
  return {
    material,
    dispose() {
      material.dispose();
      gradient.dispose();
    },
  };
}

/** A maquette: its root and a pure function from the story state to the pose of every piece. */
export interface MonumentModel<S> {
  readonly root: Object3D;
  setState(state: S): void;
  /** Explore chapter: the part under the ray (its card id) or null. */
  pick?(raycaster: Raycaster): string | null;
  /** Explore chapter: tints the pieces of a part (null = none). Applied on the next `setState`. */
  setHighlight?(part: string | null): void;
  /** Live animation of the model itself (paris: the hourly sparkle). Returns true while it needs more frames. */
  update?(deltaSeconds: number): boolean;
  /** Gives the model a way to ask for a frame by itself (a timer), even when the render loop is asleep. */
  bind?(requestFrame: () => void): void;
  dispose(): void;
}

/** What a monument provides to `createMonumentStage`. `S` is its story state: named numbers 0..1 (exploded, ruin...). */
export interface MonumentDefinition<S extends Record<string, number>> {
  id: DestinationId;
  env: MonumentEnvironment;
  track: CameraTrack;
  seed: number;
  createModel(): MonumentModel<S>;
  /** State at rest (the hero) and the state the shaders are compiled in (every kind of piece and color on screen). */
  rest: S;
  warmUp: S;
  /** State for a chapter and its progress; with reduced motion `finalStateFor` (the state a chapter ends in). */
  stateFor(chapter: number, t: number): S;
  finalStateFor(chapter: number): S;
  /**
   * The Explore chapter (the last one): drag to turn the maquette within `orbit`, tap a part, and `views` the visitor can switch
   * between (named states; their ids are the ones of the page's view buttons).
   */
  explore?: { chapter: number; orbit: OrbitLimits; views: Record<string, S> };
}

const BUDGETS: Record<QualityTier, { shadowMapSize: number; shadows: boolean; dust: number }> = {
  high: { shadowMapSize: 2048, shadows: true, dust: 380 },
  medium: { shadowMapSize: 1024, shadows: true, dust: 180 },
  low: { shadowMapSize: 1024, shadows: false, dust: 60 },
};

/** Arrival from the globe: the camera starts further, higher and turned, and settles at rest. */
const ENTRY = { dolly: 25, yaw: 8, pitch: 5 } as const;
const CAMERA_NEAR = 1;
const CAMERA_FAR = 2600;
/** Slow sway of the presentation shot (degrees, radians per second). */
const HERO_SWAY = { degrees: 3, speed: 0.22 } as const;
/** The maquette eases toward the state the scroll asks for. */
const STATE_DAMPING = 6;
const SETTLED = 0.001;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The stage of a monument page: the maquette on its pedestal under the spot. The scroll moves the camera (`track`) and the state of
 * the maquette (`stateFor`), both eased; with reduced motion each chapter is a cut to the state it ends in. Render on demand.
 */
export function createMonumentStage<S extends Record<string, number>>(host: StageHost, definition: MonumentDefinition<S>): Stage {
  const { env, seed } = definition;
  const skyColor = env.backdrop;
  const scene = new Scene();
  const camera = new PerspectiveCamera(36, 1, CAMERA_NEAR, CAMERA_FAR);
  const look = { ...DEFAULT_PLASTER, ...env.look };
  const story = new StoryCamera(definition.track);
  const target = new Vector3();
  const scratch = new Vector3();

  let model: MonumentModel<S> | null = null;
  let exhibit: Exhibit | null = null;
  let contact: ContactShadow | null = null;
  let dust: BeamDust | null = null;
  let cookie: CanvasTexture | null = null;
  let shadowsOn = false;
  let active = false;
  let aspect = 1;
  let entryAway = 0;
  let time = 0;
  let inHero = true;
  let lastActivityAt = performance.now();
  const now = { ...definition.rest } as S;
  let goal = { ...definition.rest } as S;
  let chapterNow = 0;
  let exploreView: string | null = null;
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const explore = definition.explore;
  const orbit = new ExploreOrbit({
    canvas: host.canvas,
    limits: explore?.orbit ?? { yaw: 0, pitchUp: 0, pitchDown: 0 },
    onActivity: () => wake(),
    smooth: () => !prefersReducedMotion(),
    onTap: (x, y) => pick(x, y),
  });

  /** The state the scroll asks for, or the view picked in the Explore chapter. */
  function goalFor(chapter: number, t: number): S {
    const view = explore && chapter === explore.chapter && exploreView ? explore.views[exploreView] : undefined;
    if (view) return { ...view };
    return prefersReducedMotion() ? definition.finalStateFor(chapter) : definition.stateFor(chapter, t);
  }

  function pick(clientX: number, clientY: number) {
    if (!model?.pick) return;
    const box = host.canvas.getBoundingClientRect();
    pointer.set(((clientX - box.left) / box.width) * 2 - 1, -((clientY - box.top) / box.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const part = model.pick(raycaster);
    if (part) host.select(part);
  }

  function wake() {
    lastActivityAt = performance.now();
    host.invalidate();
  }

  function placeCamera() {
    const { shot } = story;
    target.set(shot.target.x, shot.target.y, shot.target.z);
    const distance = Math.hypot(shot.radius, shot.height) + ENTRY.dolly * entryAway;
    const { pose } = orbit;
    const elevation = Math.atan2(shot.height, shot.radius) + toRadians(pose.pitch + ENTRY.pitch * entryAway);
    const sway = inHero && !prefersReducedMotion() ? Math.sin(time * HERO_SWAY.speed) * HERO_SWAY.degrees : 0;
    const azimuth = shot.angle + toRadians(pose.yaw + sway + ENTRY.yaw * entryAway);
    camera.position.set(
      target.x + distance * Math.cos(elevation) * Math.cos(azimuth),
      target.y + distance * Math.sin(elevation),
      target.z + distance * Math.cos(elevation) * Math.sin(azimuth),
    );
    camera.lookAt(target);
    // Tall screens widen the view; wide ones shift the image right (text on the left), tall ones lift it (text below).
    const boost = aspect < 1 ? Math.min(1.9, 0.85 / aspect) : 1;
    camera.fov = toDegrees(2 * Math.atan(Math.tan(toRadians(shot.fov) / 2) * boost));
    const offsetX = aspect > 1.25 ? env.framingX : 0;
    const offsetY = aspect < 1 ? 0.2 : 0;
    if (offsetX === 0 && offsetY === 0) camera.clearViewOffset();
    else camera.setViewOffset(aspect, 1, -offsetX * aspect, offsetY, aspect, 1);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  /** Eases the maquette toward the goal state. Returns true while it still moves. */
  function updateState(deltaSeconds: number): boolean {
    if (!model) return false;
    const k = prefersReducedMotion() ? 1 : 1 - Math.exp(-STATE_DAMPING * deltaSeconds);
    let moving = false;
    for (const key of Object.keys(now) as (keyof S)[]) {
      const delta = (goal[key] as number) - (now[key] as number);
      if (delta === 0) continue;
      (now[key] as number) = Math.abs(delta) < SETTLED ? (goal[key] as number) : (now[key] as number) + delta * k;
      moving = true;
    }
    if (moving) {
      model.setState(now);
      if (shadowsOn) host.refreshShadows();
    }
    return moving;
  }

  return {
    id: definition.id,
    scene,
    camera,
    look,
    skyColor,

    async load() {
      const budget = BUDGETS[host.tier()];
      scene.background = new Color(skyColor);
      scene.fog = new Fog(skyColor, env.fog.near, env.fog.far);
      shadowsOn = env.shadows && budget.shadows;

      const lamp = env.spot;
      // Physical falloff (1/d²): the intensity is given at the aim point.
      const aimDistance = new Vector3(...lamp.position).distanceTo(new Vector3(...lamp.target));
      const spot = new SpotLight(lamp.color, lamp.intensity * aimDistance ** lamp.decay, 0, toRadians(lamp.angle), lamp.penumbra, lamp.decay);
      if (lamp.cookie && shadowsOn) {
        cookie = createSoftPoolCookie(seed + 5);
        spot.map = cookie;
      }
      spot.position.set(...lamp.position);
      spot.target.position.set(...lamp.target);
      spot.castShadow = shadowsOn;
      spot.shadow.camera.near = 20;
      spot.shadow.camera.far = env.shadowFar ?? 400;
      spot.shadow.bias = env.bias;
      spot.shadow.normalBias = env.normalBias;
      spot.shadow.radius = lamp.softness;
      spot.shadow.mapSize.set(budget.shadowMapSize, budget.shadowMapSize);
      scene.add(spot, spot.target, new HemisphereLight(env.fill.sky, env.fill.ground, env.fill.intensity));
      if (env.rim) {
        const rim = new DirectionalLight(env.rim.color, env.rim.intensity);
        rim.position.set(...env.rim.position);
        scene.add(rim, rim.target);
      }

      exhibit = new Exhibit(env, seed + 41);
      scene.add(exhibit.mesh);
      if (env.contact) {
        contact = new ContactShadow(0x000000, env.contact.opacity, env.contact.width, env.contact.depth);
        contact.mesh.position.y = env.floorY + env.pedestal.height + 0.04;
        scene.add(contact.mesh);
      }
      await yieldToMain();

      model = definition.createModel();
      model.bind?.(() => {
        if (active) wake();
      });
      scene.add(model.root);
      await yieldToMain();

      if (env.dust) {
        const cone = { apex: lamp.position, target: lamp.target, angle: lamp.angle };
        const down = new Vector3(...lamp.target).sub(new Vector3(...lamp.position)).normalize().negate();
        dust = new BeamDust(budget.dust, down, seed + 9, { ...env.dust, cone });
        dust.setPixelRatio(host.pixelRatio());
        dust.setSunDirection(down);
        scene.add(dust.points);
      }

      // The warm-up sees every kind of piece and color on screen, so no state triggers a recompile later.
      model.setState(definition.warmUp);
      placeCamera();
    },

    activate() {
      active = true;
      story.reset();
      inHero = true;
      goal = { ...definition.rest };
      Object.assign(now, definition.rest);
      chapterNow = 0;
      exploreView = null;
      model?.setHighlight?.(null);
      model?.setState(now);
      orbit.reset();
      orbit.attach();
      if (shadowsOn) host.useStaticShadows(true);
      dust?.setPixelRatio(host.pixelRatio());
      placeCamera();
      wake();
    },

    deactivate() {
      active = false;
      orbit.setExploring(false);
      orbit.detach();
      if (shadowsOn) host.useStaticShadows(false);
    },

    update(deltaSeconds) {
      if (!active) return false;
      const storyMoving = story.update(deltaSeconds, !prefersReducedMotion());
      const orbitMoving = orbit.update(deltaSeconds);
      const stateMoving = updateState(deltaSeconds);
      const modelMoving = model?.update?.(deltaSeconds) ?? false;
      const idleSeconds = (performance.now() - lastActivityAt) / 1000;
      const ambient = !prefersReducedMotion() && idleSeconds < host.ambient().idleSeconds;
      if (ambient) {
        time += deltaSeconds;
        dust?.setTime(time);
      }
      placeCamera();
      return storyMoving || orbitMoving || stateMoving || modelMoving || ambient;
    },

    resize(nextAspect) {
      aspect = nextAspect;
      camera.aspect = nextAspect;
      camera.updateProjectionMatrix();
      dust?.setPixelRatio(host.pixelRatio());
      placeCamera();
    },

    transitionAnchor(): TransitionAnchor {
      scratch.copy(target).project(camera);
      return { centerX: scratch.x * 0.5 + 0.5, centerY: 0.5 - scratch.y * 0.5 };
    },

    restFor() {
      entryAway = 0;
      orbit.reset();
      placeCamera();
      host.invalidate();
    },

    setEntry(p) {
      entryAway = 1 - p;
      placeCamera();
      host.invalidate();
    },

    setStory(chapter, t) {
      story.setProgress(chapter, t);
      chapterNow = chapter;
      inHero = chapter === 0;
      orbit.setExploring(Boolean(explore) && chapter === explore!.chapter);
      goal = goalFor(chapter, t);
      wake();
    },

    setExplore(view, part) {
      exploreView = view;
      if (explore && chapterNow === explore.chapter) goal = goalFor(chapterNow, 1);
      model?.setHighlight?.(part);
      if (model) {
        model.setState(now);
        if (shadowsOn) host.refreshShadows();
      }
      wake();
    },

    sleep() {
      disposeObject(scene);
    },

    dispose() {
      active = false;
      orbit.detach();
      disposeObject(scene);
      model?.dispose();
      exhibit?.dispose();
      contact?.dispose();
      cookie?.dispose();
      scene.clear();
      model = exhibit = contact = dust = cookie = null;
      shadowsOn = false;
    },
  };
}
