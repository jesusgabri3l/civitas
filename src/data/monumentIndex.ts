import type { DestinationId } from './destinations';

/**
 * The monument index on the globe (TheOverlayIndex). PLACEHOLDER DATA: only the entries with `destination` are built; the rest are
 * examples of how the list grows ("soon"). Dates are display strings, to verify before publishing. Sorted oldest first.
 * TODO: derive the open entries from `destinations` and add the future ones as they are planned.
 */
export type Region = 'Europe' | 'Asia' | 'Africa' | 'Americas';

export interface MonumentIndexEntry {
  monument: string;
  place: string;
  date: string;
  region: Region;
  /** Set when the monument has its page: the row opens it. */
  destination?: DestinationId;
}

export const REGIONS: readonly Region[] = ['Europe', 'Asia', 'Africa', 'Americas'];

export const monumentIndex: readonly MonumentIndexEntry[] = [
  { monument: 'Great Pyramid', place: 'Giza, Egypt', date: 'c. 2560 BC', region: 'Africa' },
  { monument: 'Parthenon', place: 'Athens, Greece', date: '447 BC', region: 'Europe', destination: 'athens' },
  { monument: 'Al-Khazneh', place: 'Petra, Jordan', date: '1st c. AD', region: 'Asia' },
  { monument: 'Colosseum', place: 'Rome, Italy', date: 'AD 80', region: 'Europe', destination: 'rome' },
  { monument: 'Hagia Sophia', place: 'Istanbul, Türkiye', date: 'AD 537', region: 'Europe' },
  { monument: 'El Castillo', place: 'Chichén Itzá, Mexico', date: '9th–12th c.', region: 'Americas' },
  { monument: 'Forbidden City', place: 'Beijing, China', date: '1420', region: 'Asia' },
  { monument: 'Machu Picchu', place: 'Cusco, Peru', date: 'c. 1450', region: 'Americas' },
  { monument: 'Taj Mahal', place: 'Agra, India', date: '1653', region: 'Asia' },
  { monument: 'Eiffel Tower', place: 'Paris, France', date: '1889', region: 'Europe', destination: 'paris' },
];
