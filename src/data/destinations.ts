export type DestinationId = 'athens' | 'rome' | 'paris';

export interface PageMeta {
  path: string;
  title: string;
  description: string;
  ogImage: string;
}

export interface Destination extends PageMeta {
  id: DestinationId;
  name: string;
  monument: string;
  intro: string;
  /** Where the monument stands, in degrees. */
  coordinates: { lat: number; lon: number };
  country: string;
  /** IANA time zone, for the local time on the globe tooltip. */
  timeZone: string;
  /** One line for the globe tooltip: what you will see inside. */
  glimpse: string;
  /** Cities that read as related: the globe prefers them for this city's arcs on hover. */
  related?: DestinationId[];
}

export const home: PageMeta & { intro: string } = {
  path: '/',
  title: 'Civitas — the world’s monuments in interactive 3D',
  description:
    'Spin the globe and explore the Parthenon, the Colosseum and the Eiffel Tower in interactive 3D: the story of each monument, told by taking it apart.',
  ogImage: '/og/home.svg',
  intro: 'One globe, three monuments. Pick a destination to step inside.',
};

export const destinations: Destination[] = [
  {
    id: 'athens',
    path: '/athens',
    name: 'Athens',
    monument: 'Parthenon',
    title: 'The Parthenon in 3D, Athens — Civitas',
    description: 'Explore the Parthenon in interactive 3D: take it apart, see it in its original colors and follow it through 1687 and the restoration.',
    ogImage: '/og/athens.svg',
    intro: 'Athens, the Parthenon rebuilt piece by piece.',
    coordinates: { lat: 37.9715, lon: 23.7257 },
    country: 'Greece',
    timeZone: 'Europe/Athens',
    glimpse: 'The Parthenon as a plaster maquette: taken apart, painted, blown up in 1687 and restored.',
  },
  {
    id: 'rome',
    path: '/rome',
    name: 'Rome',
    monument: 'Colosseum',
    title: 'The Colosseum in 3D, Rome — Civitas',
    description: 'Explore the Colosseum in interactive 3D at dawn: its full outer ring against the ruin of today.',
    ogImage: '/og/rome.svg',
    intro: 'Rome, a cold dawn over the Colosseum.',
    coordinates: { lat: 41.8902, lon: 12.4922 },
    country: 'Italy',
    timeZone: 'Europe/Rome',
    glimpse: 'The Colosseum at cold dawn: the full outer ring against the ruin of today.',
  },
  {
    id: 'paris',
    path: '/paris',
    name: 'Paris',
    monument: 'Eiffel Tower',
    title: 'The Eiffel Tower in 3D, Paris — Civitas',
    description: 'Explore the Eiffel Tower in interactive 3D by night, from the first sketch to its hourly sparkle.',
    ogImage: '/og/paris.svg',
    intro: 'Paris, an amber night around the Eiffel Tower.',
    coordinates: { lat: 48.8584, lon: 2.2945 },
    country: 'France',
    timeZone: 'Europe/Paris',
    glimpse: 'The Eiffel Tower by night, girder by girder, with its hourly sparkle.',
  },
];
