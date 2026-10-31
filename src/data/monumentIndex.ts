import { cities, type DestinationId } from '../cities';
import type { Region } from '../cities/types';

/**
 * The monument index on the globe (TheOverlayIndex). The open rows come from the city registry (`cities/index.ts`); `soon` is the
 * future ones: PLACEHOLDER DATA, dates are display strings to verify before publishing. When one gets its page, delete it from
 * `soon` (its row then comes from its `meta`). `year` sorts the list, oldest first (negative = BC).
 */
export type { Region };

export interface MonumentIndexEntry {
  monument: string;
  place: string;
  date: string;
  region: Region;
  /** Extra words the search matches (local names, aliases). Open rows take them from `meta.keywords`. */
  keywords?: readonly string[];
  /** Set when the monument has its page: the row opens it. */
  destination?: DestinationId;
}

export const REGIONS: readonly Region[] = ['Europe', 'Asia', 'Africa', 'Americas'];

const soon: readonly (MonumentIndexEntry & { year: number })[] = [
  { monument: 'Great Pyramid', place: 'Giza, Egypt', date: 'c. 2560 BC', year: -2560, region: 'Africa', keywords: ['Khufu', 'Cheops', 'Egypt', 'Pyramids of Giza'] },
  { monument: 'Al-Khazneh', place: 'Petra, Jordan', date: '1st c. AD', year: 1, region: 'Asia', keywords: ['The Treasury', 'Nabataean', 'Rose City'] },
  { monument: 'Hagia Sophia', place: 'Istanbul, Türkiye', date: 'AD 537', year: 537, region: 'Europe', keywords: ['Ayasofya', 'Constantinople', 'Byzantine', 'Turkey'] },
  { monument: 'El Castillo', place: 'Chichén Itzá, Mexico', date: '9th–12th c.', year: 900, region: 'Americas', keywords: ['Kukulcán', 'Kukulkan', 'Maya', 'Temple of Kukulcan'] },
  { monument: 'Forbidden City', place: 'Beijing, China', date: '1420', year: 1420, region: 'Asia', keywords: ['Gugong', '故宫', 'Imperial Palace', 'Ming'] },
  { monument: 'Machu Picchu', place: 'Cusco, Peru', date: 'c. 1450', year: 1450, region: 'Americas', keywords: ['Inca', 'Machu Pikchu'] },
  { monument: 'Taj Mahal', place: 'Agra, India', date: '1653', year: 1653, region: 'Asia', keywords: ['Mughal', 'Mausoleum', 'Shah Jahan'] },
];

const open: readonly (MonumentIndexEntry & { year: number })[] = cities.map((city) => ({
  monument: city.monument,
  place: `${city.name}, ${city.country}`,
  date: city.date,
  year: city.year,
  region: city.region,
  keywords: city.keywords,
  destination: city.id,
}));

export const monumentIndex: readonly MonumentIndexEntry[] = [...soon, ...open]
  .sort((a, b) => a.year - b.year)
  .map(({ year: _year, ...entry }) => entry);
