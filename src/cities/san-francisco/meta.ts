import type { CityMeta } from '../types';

/**
 * San Francisco: evening fog gray, International Orange. Jost follows the geometry of Futura (1927), the letter of the decade of the
 * bridge. `accent` is the lifted orange (`accentStrong` of the brief): the page uses it for lines, CTA and timeline, and the maquette
 * paints its own oranges in `stage/sanFranciscoConfig.ts` (International Orange `#C0362C` is only 2.9:1 on this ground).
 */
export const meta = {
  id: 'san-francisco',
  path: '/san-francisco',
  name: 'San Francisco',
  monument: 'Golden Gate Bridge',
  title: 'The Golden Gate Bridge in 3D — Civitas',
  description: 'Why is the Golden Gate Bridge orange? The Navy wanted black and yellow stripes. Watch it rise tower by tower and see the net that saved 19 men.',
  ogImage: '/og/san-francisco.jpg',
  ogImageAlt: 'The Golden Gate Bridge in International Orange over the strait, in the fog.',
  intro: 'San Francisco, an evening fog over the strait and the bridge.',
  coordinates: { lat: 37.8199, lon: -122.4783 },
  country: 'United States',
  timeZone: 'America/Los_Angeles',
  glimpse: 'The Golden Gate Bridge as a maquette: its towers, its cables and its net, and the color nobody planned.',
  date: '1937',
  year: 1937,
  region: 'Americas',
  keywords: ['Golden Gate', 'International Orange', 'Suspension bridge', 'California', 'Bay Area', 'SF', 'Puente Golden Gate', 'USA'],
  es: {
    name: 'San Francisco',
    monument: 'Puente Golden Gate',
    title: 'El puente Golden Gate en 3D — Civitas',
    description: '¿Por qué el Golden Gate es naranja? La Marina lo quería a rayas negras y amarillas. Mira cómo sube torre por torre y la red que salvó a 19 hombres.',
    ogImageAlt: 'El puente Golden Gate en International Orange sobre el estrecho, entre la niebla.',
    intro: 'San Francisco, una niebla de tarde sobre el estrecho y el puente.',
    country: 'Estados Unidos',
    glimpse: 'El puente Golden Gate como maqueta: sus torres, sus cables y su red, y el color que nadie planeó.',
    date: '1937',
  },
  theme: {
    ground: '#232220',
    accent: '#f26a3a',
    accentStrong: '#f26a3a',
    fontDisplay: "'Jost', 'Futura', 'Century Gothic', system-ui, sans-serif",
    fontBody: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    displayWeight: 500,
  },
} as const satisfies CityMeta;
