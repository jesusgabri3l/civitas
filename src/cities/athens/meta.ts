import type { CityMeta } from '../types';

/** Athens: the identity of the page (ground, accent, type) and the facts of the globe and the index. */
export const meta = {
  id: 'athens',
  path: '/athens',
  name: 'Athens',
  monument: 'Parthenon',
  title: 'The Parthenon in 3D, Athens — Civitas',
  description: 'Explore the Parthenon in interactive 3D: take it apart, see it in its original colors and follow it through 1687 and the restoration.',
  ogImage: '/og/athens.jpg',
  ogImageAlt: 'The Parthenon in Athens, painted in its original colors.',
  intro: 'Athens, the Parthenon rebuilt piece by piece.',
  coordinates: { lat: 37.9715, lon: 23.7257 },
  country: 'Greece',
  timeZone: 'Europe/Athens',
  glimpse: 'The Parthenon as a plaster maquette: taken apart, painted, blown up in 1687 and restored.',
  date: '447 BC',
  year: -447,
  region: 'Europe',
  theme: {
    ground: '#0f1a2a',
    accent: '#c8673e',
    accentStrong: '#e08a62',
    fontDisplay: "'GFS Didot', 'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    fontBody: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  },
} as const satisfies CityMeta;
