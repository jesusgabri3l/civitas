import type { PerspectiveCamera, Scene } from 'three';
import type { StageId } from '../../state/appStore';
import type { AmbientPolicy, QualityTier } from '../quality/qualityTier';
import type { PlasterSettings } from '../render/PlasterLook';

/**
 * A self-contained scene. Lifecycle driven by the StageManager:
 * load (JS/CPU assets) -> warm (shaders compiled) -> activate -> sleep (GPU freed, JS kept) -> dispose.
 */
export interface Stage {
  readonly id: StageId;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly look: PlasterSettings;
  /** Color of the sky (see `data/stageSky.ts`). */
  readonly skyColor: number;

  load(): Promise<void>;
  activate(): void;
  deactivate(): void;
  /** Advances animation. Returns true while it still needs frames (render on demand otherwise). */
  update(deltaSeconds: number): boolean;
  resize(aspect: number): void;
  /**
   * Optional transition hooks (the engine drives them with one progress for the whole crossing).
   * Where the focus of the crossing sits on screen, in viewport fractions from the top left.
   */
  transitionAnchor?(target?: StageId): TransitionAnchor;
  /** Puts the stage, with no animation, in the pose a trip with `target` starts from (leaving a city for the globe, deep link included). */
  restFor?(target: StageId): void;
  /** This stage is being left: `p` 0 = at rest, 1 = fully gone. */
  setExit?(p: number, target: StageId): void;
  /** This stage is being entered: `p` 0 = just arrived, away from rest, 1 = settled at rest. */
  setEntry?(p: number, source: StageId): void;
  /** Frees GPU memory. Keeps JS state: waking is a warm() away. */
  sleep(): void;
  /** Frees everything. The stage must be loaded again to be used. */
  dispose(): void;
}

export interface TransitionAnchor {
  centerX: number;
  centerY: number;
}

export interface StageModule {
  createStage(host: StageHost): Stage;
}

export type StageLoaders = Record<StageId, () => Promise<StageModule>>;

export interface StageHost {
  /** The canvas the engine renders to (stages that take input listen to it). */
  readonly canvas: HTMLCanvasElement;
  /** Asks for one more frame (render on demand). */
  invalidate(): void;
  /** Current ambient animation budget (depends on the quality tier and device). */
  ambient(): AmbientPolicy;
  /** Current quality tier (stages pick lighter assets on `low`). */
  tier(): QualityTier;
  /** Effective pixels per CSS pixel of the scene pass (device pixel ratio capped by the tier and render scale). */
  pixelRatio(): number;
  /** Compiles the shaders of a stage without blocking (renderer.compileAsync). */
  compile(stage: Stage): Promise<void>;
}

export type StageStatus = 'idle' | 'loading' | 'loaded' | 'warm' | 'active' | 'asleep';
