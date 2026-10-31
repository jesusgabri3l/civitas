import type { StageLoaders } from '../engine/stage/Stage';
import type { CityMeta } from './types';
import { meta as athens } from './athens/meta';
import { meta as paris } from './paris/meta';
import { meta as rome } from './rome/meta';

/**
 * Registry of the cities, safe for the client (only the light `meta` of each one). To add a city: its folder in `cities/<id>/`,
 * one line in `cities` and one in `cityStageLoaders` here, and one in `server.ts`. The index search picks it up from `cities`:
 * drop its row from `soon` in data/monumentIndex.ts and give its meta `keywords` (tests/monumentIndex.test.ts checks it). The order is the one of the globe list and the nav.
 */
export const cities = [athens, rome, paris] as const;

export type DestinationId = (typeof cities)[number]['id'];

/** One dynamic import per city: each stage is its own chunk, downloaded only when needed. */
export const cityStageLoaders: Omit<StageLoaders, 'globe'> = {
  athens: () => import('./athens/stage/athensStage'),
  rome: () => import('./rome/stage/romeStage'),
  paris: () => import('./paris/stage/parisStage'),
};

/** A registered city, with every optional field of `CityMeta` and its id narrowed. */
export type City = Omit<CityMeta, 'id'> & { id: DestinationId };
