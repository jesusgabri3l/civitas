import type { Stage, StageHost } from '../../../engine/stage/Stage';
import { createMonumentStage } from '../../../engine/stages/shared/monument';
import { GoldenGateBridge } from './GoldenGateBridge';
import { EXPLORE, finalStateFor, REST, SAN_FRANCISCO_ENV, SAN_FRANCISCO_TRACK, SEED, stateFor, WARM_UP, type BridgeState } from './sanFranciscoConfig';

/** San Francisco: the Golden Gate Bridge maquette and its story (see `sanFranciscoConfig.ts` and src/cities/san-francisco/story.ts). */
export function createStage(host: StageHost): Stage {
  return createMonumentStage<BridgeState>(host, {
    id: 'san-francisco',
    env: SAN_FRANCISCO_ENV,
    track: SAN_FRANCISCO_TRACK,
    seed: SEED,
    createModel: () => GoldenGateBridge.create(),
    rest: REST,
    warmUp: WARM_UP,
    stateFor,
    finalStateFor,
    explore: EXPLORE,
  });
}
