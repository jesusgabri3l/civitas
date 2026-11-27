import type { Stage, StageHost } from '../../../engine/stage/Stage';
import { createMonumentStage } from '../../../engine/stages/shared/monument';
import { GreatPyramid } from './GreatPyramid';
import { EXPLORE, finalStateFor, GIZA_ENV, GIZA_TRACK, REST, SEED, stateFor, WARM_UP, type GizaState } from './gizaConfig';

/** Giza: the Great Pyramid maquette and its story (see `gizaConfig.ts` and src/cities/giza/story.ts). */
export function createStage(host: StageHost): Stage {
  return createMonumentStage<GizaState>(host, {
    id: 'giza',
    env: GIZA_ENV,
    track: GIZA_TRACK,
    seed: SEED,
    createModel: () => GreatPyramid.create(),
    rest: REST,
    warmUp: WARM_UP,
    stateFor,
    finalStateFor,
    explore: EXPLORE,
  });
}
