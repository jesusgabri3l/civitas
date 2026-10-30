import type { StageId } from '../state/appStore';
import { PALETTE } from '../engine/stages/globe/palette';
import { ATHENS_ENV } from '../engine/stages/athens/athensConfig';
import { PARIS_ENV } from '../engine/stages/paris/parisConfig';
import { ROME_ENV } from '../engine/stages/rome/romeConfig';

export interface StageSky {
  /** Color of the sky: the ground of the monument (the globe trip fades into it). */
  skyColor: number;
}

/** Known without loading the stage, so a transition can start before its scene exists. */
export const stageSky: Record<StageId, StageSky> = {
  globe: { skyColor: PALETTE.ink },
  athens: { skyColor: ATHENS_ENV.backdrop },
  rome: { skyColor: ROME_ENV.backdrop },
  paris: { skyColor: PARIS_ENV.backdrop },
};
