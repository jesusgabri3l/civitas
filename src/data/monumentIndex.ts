import { citiesFor, type DestinationId } from '../cities';
import type { Region } from '../cities/types';
import { LANGS, otherLang, type Lang } from '../i18n/lang';
import { ui } from '../i18n/ui';

/**
 * The monument index on the globe (TheOverlayIndex). The open rows come from the city registry (`cities/index.ts`); `soon` is the
 * future ones: PLACEHOLDER DATA, dates are display strings to verify before publishing, each with its Spanish texts in `es`. When one
 * gets its page, delete it from `soon` (its row then comes from its `meta`). `year` sorts the list, oldest first (negative = BC).
 */
export type { Region };

export interface MonumentIndexEntry {
  monument: string;
  place: string;
  date: string;
  region: Region;
  /** Extra words the search matches (local names, aliases, the other language's names). Open rows take them from `meta.keywords`. */
  keywords?: readonly string[];
  /** Set when the monument has its page: the row opens it. */
  destination?: DestinationId;
}

export const REGIONS: readonly Region[] = ['Europe', 'Asia', 'Africa', 'Americas'];

interface SoonTexts {
  monument: string;
  place: string;
  date: string;
}

const soon: readonly (SoonTexts & { year: number; region: Region; keywords: readonly string[]; es: SoonTexts })[] = [
  { monument: 'Great Pyramid', place: 'Giza, Egypt', date: 'c. 2560 BC', year: -2560, region: 'Africa', keywords: ['Khufu', 'Cheops', 'Egypt', 'Pyramids of Giza'], es: { monument: 'Gran Pirámide', place: 'Guiza, Egipto', date: 'h. 2560 a. C.' } },
  { monument: 'Al-Khazneh', place: 'Petra, Jordan', date: '1st c. AD', year: 1, region: 'Asia', keywords: ['The Treasury', 'Nabataean', 'Rose City'], es: { monument: 'Al-Khazneh (El Tesoro)', place: 'Petra, Jordania', date: 'siglo I d. C.' } },
  { monument: 'Hagia Sophia', place: 'Istanbul, Türkiye', date: 'AD 537', year: 537, region: 'Europe', keywords: ['Ayasofya', 'Constantinople', 'Byzantine', 'Turkey'], es: { monument: 'Santa Sofía', place: 'Estambul, Turquía', date: '537 d. C.' } },
  { monument: 'El Castillo', place: 'Chichén Itzá, Mexico', date: '9th–12th c.', year: 900, region: 'Americas', keywords: ['Kukulcán', 'Kukulkan', 'Maya', 'Temple of Kukulcan'], es: { monument: 'El Castillo', place: 'Chichén Itzá, México', date: 'siglos IX–XII' } },
  { monument: 'Forbidden City', place: 'Beijing, China', date: '1420', year: 1420, region: 'Asia', keywords: ['Gugong', '故宫', 'Imperial Palace', 'Ming'], es: { monument: 'Ciudad Prohibida', place: 'Pekín, China', date: '1420' } },
  { monument: 'Machu Picchu', place: 'Cusco, Peru', date: 'c. 1450', year: 1450, region: 'Americas', keywords: ['Inca', 'Machu Pikchu'], es: { monument: 'Machu Picchu', place: 'Cusco, Perú', date: 'h. 1450' } },
  { monument: 'Taj Mahal', place: 'Agra, India', date: '1653', year: 1653, region: 'Asia', keywords: ['Mughal', 'Mausoleum', 'Shah Jahan'], es: { monument: 'Taj Mahal', place: 'Agra, India', date: '1653' } },
];

function buildIndex(lang: Lang): readonly MonumentIndexEntry[] {
  const other = otherLang(lang);
  const regionWords = (region: Region) => LANGS.map((each) => ui[each].regions[region]);
  const otherCities = citiesFor(other);

  const soonRows = soon.map((row) => {
    const here = lang === 'en' ? row : row.es;
    const there = lang === 'en' ? row.es : row;
    return {
      year: row.year,
      monument: here.monument,
      place: here.place,
      date: here.date,
      region: row.region,
      keywords: [...row.keywords, there.monument, there.place, ...regionWords(row.region)],
    };
  });

  // Each row also carries the words of the other language (the same city there), so both spellings find it.
  const openRows = citiesFor(lang).map((city, index) => {
    const twin = otherCities[index];
    return {
      year: city.year,
      monument: city.monument,
      place: `${city.name}, ${city.country}`,
      date: city.date,
      region: city.region,
      keywords: [...(city.keywords ?? []), twin.monument, twin.name, twin.country, ...regionWords(city.region)],
      destination: city.id,
    };
  });

  return [...soonRows, ...openRows].sort((a, b) => a.year - b.year).map(({ year: _year, ...entry }) => entry);
}

const byLang = new Map<Lang, readonly MonumentIndexEntry[]>();

/** The index in a language, oldest first. Computed once per language. */
export function monumentIndexFor(lang: Lang): readonly MonumentIndexEntry[] {
  let index = byLang.get(lang);
  if (!index) {
    index = buildIndex(lang);
    byLang.set(lang, index);
  }
  return index;
}

/** The English index (what the tests and the default page use). */
export const monumentIndex: readonly MonumentIndexEntry[] = monumentIndexFor('en');
