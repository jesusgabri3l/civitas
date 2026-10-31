import { monumentIndex, type MonumentIndexEntry, type Region } from './monumentIndex';

/** Lowercase and without accents (NFD), so "Türkiye" matches "turkiye" and "Chichén" matches "chichen". */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** What each entry can be found by: monument, place (city, country), region, date and keywords. Computed once. */
const haystacks = new Map<MonumentIndexEntry, string>(
  monumentIndex.map((entry) => [
    entry,
    normalizeText([entry.monument, entry.place, entry.region, entry.date, ...(entry.keywords ?? [])].join(' ')),
  ]),
);

/** Every word of the query must appear somewhere in the entry. Keeps the index order (oldest first). */
export function searchMonuments(query: string, region: Region | null = null): readonly MonumentIndexEntry[] {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  return monumentIndex.filter((entry) => {
    if (region && entry.region !== region) return false;
    const haystack = haystacks.get(entry) ?? '';
    return words.every((word) => haystack.includes(word));
  });
}
