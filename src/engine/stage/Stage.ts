import type { PerspectiveCamera, Scene } from 'three';
import type { StageId } from '../../state/appStore';
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
  /** Color the screen fades to while this stage is entered or left. */
  readonly skyColor: number;

  load(): Promise<void>;
  activate(): void;
  deactivate(): void;
  /** Advances animation. Returns true while it still needs frames (render on demand otherwise). */
  update(deltaSeconds: number): boolean;
  resize(aspect: number): void;
  /** Frees GPU memory. Keeps JS state: waking is a warm() away. */
  sleep(): void;
  /** Frees everything. The stage must be loaded again to be used. */
  dispose(): void;
}

export interface StageModule {
  createStage(): Stage;
}

export type StageLoaders = Record<StageId, () => Promise<StageModule>>;

export interface StageHost {
  /** Compiles the shaders of a stage without blocking (renderer.compileAsync). */
  compile(stage: Stage): Promise<void>;
}

export type StageStatus = 'idle' | 'loading' | 'loaded' | 'warm' | 'active' | 'asleep';
