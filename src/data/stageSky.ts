import type { StageId } from '../state/appStore';
import { cities } from '../cities';
import { colorNumber } from '../cities/theme';
import { PALETTE } from '../engine/stages/globe/palette';

export interface StageSky {
  /** Color of the sky: the ground of the monument (the globe trip fades into it). */
  skyColor: number;
}

/** Known without loading the stage, so a transition can start before its scene exists. The cities read it from their `meta.theme`. */
export const stageSky = {
  globe: { skyColor: PALETTE.ink },
  ...Object.fromEntries(cities.map((city) => [city.id, { skyColor: colorNumber(city.theme.ground) }])),
} as Record<StageId, StageSky>;
