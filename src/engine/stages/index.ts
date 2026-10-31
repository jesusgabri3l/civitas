import { cityStageLoaders } from '../../cities';
import type { StageLoaders } from '../stage/Stage';

/** One dynamic import per stage: each stage is its own chunk, downloaded only when needed. The cities register theirs in `cities/index.ts`. */
export const stageLoaders: StageLoaders = {
  globe: () => import('./globeStage'),
  ...cityStageLoaders,
};
