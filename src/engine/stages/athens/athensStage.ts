import type { Stage, StageHost } from '../../stage/Stage';
import { createMonumentStage } from '../shared/monument';
import { ATHENS_ENV, ATHENS_TRACK, EXPLORE, finalStateFor, INTACT, SEED, stateFor, WARM_UP, type AthensState } from './athensConfig';
import { Parthenon } from './Parthenon';

/** Athens: the Parthenon maquette and its story (see `athensConfig.ts` and src/data/stories/athens.ts). */
export function createStage(host: StageHost): Stage {
  return createMonumentStage<AthensState>(host, {
    id: 'athens',
    env: ATHENS_ENV,
    track: ATHENS_TRACK,
    seed: SEED,
    createModel: () => new Parthenon(SEED),
    rest: INTACT,
    warmUp: WARM_UP,
    stateFor,
    finalStateFor,
    explore: EXPLORE,
  });
}
