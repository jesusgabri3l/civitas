import type { CityMeta } from '../types';

/** Paris: night violet, champagne. Bodoni Moda italic is the voice of the city (a conscious exception to the upright brand type). */
export const meta = {
  id: 'paris',
  path: '/paris',
  name: 'Paris',
  monument: 'Eiffel Tower',
  title: 'The Eiffel Tower in 3D, Paris — Civitas',
  description: 'Explore the Eiffel Tower in interactive 3D by night, from the first sketch to its hourly sparkle.',
  ogImage: '/og/paris.jpg',
  ogImageAlt: 'The Eiffel Tower in Paris by night, its lights sparkling.',
  intro: 'Paris, an amber night around the Eiffel Tower.',
  coordinates: { lat: 48.8584, lon: 2.2945 },
  country: 'France',
  timeZone: 'Europe/Paris',
  glimpse: 'The Eiffel Tower by night, girder by girder, with its hourly sparkle.',
  date: '1889',
  year: 1889,
  region: 'Europe',
  keywords: ['Tour Eiffel', 'La Dame de Fer', 'Iron Lady', 'Champ de Mars', 'French'],
  theme: {
    ground: '#121022',
    accent: '#e9c46a',
    accentStrong: '#f0d58a',
    fontDisplay: "'Bodoni Moda', 'Didot', 'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    fontBody: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    displayStyle: 'italic',
  },
} as const satisfies CityMeta;
