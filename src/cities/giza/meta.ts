import type { CityMeta } from '../types';

/**
 * Giza: desert night ocre, Egyptian blue. Rokkitt follows the geometric slab serifs that the nineteenth century called "Egyptian".
 */
export const meta = {
  id: 'giza',
  path: '/giza',
  name: 'Giza',
  monument: 'Great Pyramid',
  title: 'The Great Pyramid of Giza in 3D — Civitas',
  description: 'The Great Pyramid was once smooth and white. See how it looked, course by course, put its white Tura limestone casing back and look inside it.',
  ogImage: '/og/giza.jpg',
  ogImageAlt: 'The Great Pyramid of Giza with its white casing closing over the courses, lit from the side.',
  intro: 'Giza, a desert dawn over the plateau and the pyramid.',
  coordinates: { lat: 29.9792, lon: 31.1342 },
  country: 'Egypt',
  timeZone: 'Africa/Cairo',
  glimpse: 'The Great Pyramid as a maquette: its courses, its white casing and the chambers inside.',
  date: 'c. 2560 BC',
  year: -2560,
  region: 'Africa',
  keywords: ['Khufu', 'Cheops', 'Keops', 'Akhet Khufu', 'Gran Pirámide', 'Pyramids of Giza', 'Guiza', 'Egypt', 'Egipto'],
  es: {
    name: 'Guiza',
    monument: 'Gran Pirámide',
    title: 'La Gran Pirámide de Guiza en 3D — Civitas',
    description: 'La Gran Pirámide fue lisa y blanca. Mira cómo era, hilada por hilada, devuélvele su revestimiento de caliza blanca de Tura y entra a verla por dentro.',
    ogImageAlt: 'La Gran Pirámide de Guiza con su revestimiento blanco cerrándose sobre las hiladas, iluminada de lado.',
    intro: 'Guiza, un amanecer en el desierto sobre la meseta y la pirámide.',
    country: 'Egipto',
    glimpse: 'La Gran Pirámide como maqueta: sus hiladas, su revestimiento blanco y las cámaras de su interior.',
    date: 'h. 2560 a. C.',
  },
  theme: {
    ground: '#241a0c',
    accent: '#5b8fd9',
    accentStrong: '#5b8fd9',
    fontDisplay: "'Rokkitt', 'Rockwell', 'Roboto Slab', Georgia, serif",
    fontBody: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    displayWeight: 600,
  },
} as const satisfies CityMeta;
