import type { Stage, StageHost } from '../../../engine/stage/Stage';
import { createMonumentStage } from '../../../engine/stages/shared/monument';
import { EiffelTower } from './EiffelTower';
import { EXPLORE, finalStateFor, PARIS_ENV, PARIS_TRACK, REST, SEED, stateFor, WARM_UP, type ParisState } from './parisConfig';

/** Paris: the Eiffel Tower maquette and its story (see `parisConfig.ts` and src/cities/paris/story.ts). */
export function createStage(host: StageHost): Stage {
  return createMonumentStage<ParisState>(host, {
    id: 'paris',
    env: PARIS_ENV,
    track: PARIS_TRACK,
    seed: SEED,
    createModel: () => new EiffelTower(SEED),
    rest: REST,
    warmUp: WARM_UP,
    stateFor,
    finalStateFor,
    explore: EXPLORE,
  });
}
