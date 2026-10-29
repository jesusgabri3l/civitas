import type { StageId } from '../state/appStore';
import { PALETTE } from '../engine/stages/globe/palette';

export interface StageSky {
  /** Color of the sky. */
  skyColor: number;
}

/** Known without loading the stage, so a transition can start before its scene exists. */
export const stageSky: Record<StageId, StageSky> = {
  globe: { skyColor: PALETTE.ink },
  athens: { skyColor: 0xf2c27a },
  rome: { skyColor: 0xaab8c8 },
  paris: { skyColor: 0x141026 },
};
