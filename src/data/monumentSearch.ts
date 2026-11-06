import type { Lang } from '../i18n/lang';
import { monumentIndexFor, type MonumentIndexEntry, type Region } from './monumentIndex';

/** Lowercase and without accents (NFD), so "Türkiye" matches "turkiye" and "Chichén" matches "chichen". */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** What each entry can be found by: monument, place (city, country), region, date and keywords (which carry the other language too). Computed once. */
const haystacks = new WeakMap<MonumentIndexEntry, string>();
const haystackOf = (entry: MonumentIndexEntry) => {
  let haystack = haystacks.get(entry);
  if (haystack === undefined) {
    haystack = normalizeText([entry.monument, entry.place, entry.region, entry.date, ...(entry.keywords ?? [])].join(' '));
    haystacks.set(entry, haystack);
  }
  return haystack;
};

/** Every word of the query must appear somewhere in the entry. Keeps the index order (oldest first). */
export function searchMonuments(query: string, region: Region | null = null, lang: Lang = 'en'): readonly MonumentIndexEntry[] {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  return monumentIndexFor(lang).filter((entry) => {
    if (region && entry.region !== region) return false;
    const haystack = haystackOf(entry);
    return words.every((word) => haystack.includes(word));
  });
}
