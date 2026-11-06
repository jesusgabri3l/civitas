import type { StageLoaders } from '../engine/stage/Stage';
import { DEFAULT_LANG, withLang, type Lang } from '../i18n/lang';
import type { CityMeta } from './types';
import { meta as athens } from './athens/meta';
import { meta as paris } from './paris/meta';
import { meta as rome } from './rome/meta';

/**
 * Registry of the cities, safe for the client (only the light `meta` of each one). To add a city: its folder in `cities/<id>/`
 * (with `meta.es` and `story.es.ts`), one line in `cities` and one in `cityStageLoaders` here, and one per language in `server.ts`.
 * The index search picks it up from `cities`:
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

/** A city in a language: its `es` texts over the English ones, and its `path` under `/es`. English is the city itself. */
export function localCity(city: City, lang: Lang): City {
  if (lang === DEFAULT_LANG) return city;
  return { ...city, ...city.es, path: withLang(lang, city.path) };
}

const byLang = new Map<Lang, readonly City[]>();

/** The whole registry in a language (same order), computed once per language. */
export function citiesFor(lang: Lang): readonly City[] {
  let list = byLang.get(lang);
  if (!list) {
    list = (cities as readonly City[]).map((city) => localCity(city, lang));
    byLang.set(lang, list);
  }
  return list;
}
