import type { Stage, StageHost } from '../../../engine/stage/Stage';
import { createMonumentStage } from '../../../engine/stages/shared/monument';
import { StatueOfLiberty } from './StatueOfLiberty';
import { EXPLORE, finalStateFor, NEW_YORK_ENV, NEW_YORK_TRACK, REST, SEED, stateFor, WARM_UP, type LibertyState } from './newYorkConfig';

/** New York: the Statue of Liberty maquette and its story (see `newYorkConfig.ts` and src/cities/new-york/story.ts). */
export function createStage(host: StageHost): Stage {
  return createMonumentStage<LibertyState>(host, {
    id: 'new-york',
    env: NEW_YORK_ENV,
    track: NEW_YORK_TRACK,
    seed: SEED,
    createModel: () => StatueOfLiberty.create(),
    rest: REST,
    warmUp: WARM_UP,
    stateFor,
    finalStateFor,
    explore: EXPLORE,
  });
}
