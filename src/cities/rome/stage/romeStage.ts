import type { Stage, StageHost } from '../../../engine/stage/Stage';
import { createMonumentStage } from '../../../engine/stages/shared/monument';
import { Colosseum } from './Colosseum';
import { EXPLORE, finalStateFor, REST, ROME_ENV, ROME_TRACK, SEED, stateFor, WARM_UP, type ColosseumState } from './romeConfig';

/** Rome: the Colosseum maquette and its story (see `romeConfig.ts` and src/cities/rome/story.ts). */
export function createStage(host: StageHost): Stage {
  return createMonumentStage<ColosseumState>(host, {
    id: 'rome',
    env: ROME_ENV,
    track: ROME_TRACK,
    seed: SEED,
    createModel: () => new Colosseum(SEED),
    rest: REST,
    warmUp: WARM_UP,
    stateFor,
    finalStateFor,
    explore: EXPLORE,
  });
}
