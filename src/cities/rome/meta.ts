import type { CityMeta } from '../types';

/** Rome: cold slate, pompeian red (4.8:1 on the ground, so no separate text accent). Cinzel 500: the capitals of Roman inscriptions. */
export const meta = {
  id: 'rome',
  path: '/rome',
  name: 'Rome',
  monument: 'Colosseum',
  title: 'The Colosseum in 3D, Rome — Civitas',
  description: 'Explore the Colosseum in interactive 3D at dawn: its full outer ring against the ruin of today.',
  ogImage: '/og/rome.jpg',
  ogImageAlt: 'The Colosseum in Rome in AD 80, its outer ring whole.',
  intro: 'Rome, a cold dawn over the Colosseum.',
  coordinates: { lat: 41.8902, lon: 12.4922 },
  country: 'Italy',
  timeZone: 'Europe/Rome',
  glimpse: 'The Colosseum at cold dawn: the full outer ring against the ruin of today.',
  date: 'AD 80',
  year: 80,
  region: 'Europe',
  keywords: ['Roma', 'Colosseo', 'Flavian Amphitheatre', 'Amphitheatrum Flavium', 'Roman'],
  theme: {
    ground: '#141a22',
    accent: '#db5f45',
    accentStrong: '#db5f45',
    fontDisplay: "'Cinzel', 'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    fontBody: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    displayWeight: 500,
  },
} as const satisfies CityMeta;
