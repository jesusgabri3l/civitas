import type { StageLoaders } from '../stage/Stage';

/** One dynamic import per stage: each stage is its own chunk, downloaded only when needed. */
export const stageLoaders: StageLoaders = {
  globe: () => import('./globeStage'),
  athens: () => import('./athens/athensStage'),
  rome: () => import('./rome/romeStage'),
  paris: () => import('./paris/parisStage'),
};
