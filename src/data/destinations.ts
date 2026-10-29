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
  title: 'Civitas — the world’s monuments in 3D',
  description:
    'Spin the globe and step into Athens, Rome and Paris: monuments in 3D with light, atmosphere and history.',
  ogImage: '/og/home.svg',
  intro: 'One globe, three monuments. Pick a destination to step inside.',
};

export const destinations: Destination[] = [
  {
    id: 'athens',
    path: '/athens',
    name: 'Athens',
    monument: 'Parthenon',
    title: 'Athens and the Parthenon in 3D — Civitas',
    description: 'The Parthenon at golden hour: light, dust and the story of the Acropolis of Athens, in 3D.',
    ogImage: '/og/athens.svg',
    intro: 'Athens, golden hour over the Acropolis.',
    coordinates: { lat: 37.9715, lon: 23.7257 },
    country: 'Greece',
    timeZone: 'Europe/Athens',
    glimpse: 'The Parthenon glowing at golden hour, with drifting dust and warm haze.',
  },
  {
    id: 'rome',
    path: '/rome',
    name: 'Rome',
    monument: 'Colosseum',
    title: 'Rome and the Colosseum in 3D — Civitas',
    description: 'The Colosseum at cold dawn, wrapped in mist, with its fourth tier restored, in 3D.',
    ogImage: '/og/rome.svg',
    intro: 'Rome, a cold dawn over the Colosseum.',
    coordinates: { lat: 41.8902, lon: 12.4922 },
    country: 'Italy',
    timeZone: 'Europe/Rome',
    glimpse: 'The Colosseum at cold dawn, wrapped in mist, with its fourth tier restored.',
  },
  {
    id: 'paris',
    path: '/paris',
    name: 'Paris',
    monument: 'Eiffel Tower',
    title: 'Paris and the Eiffel Tower in 3D — Civitas',
    description: 'The Eiffel Tower by night, lit in amber, with its famous sparkle, in 3D.',
    ogImage: '/og/paris.svg',
    intro: 'Paris, an amber night around the Eiffel Tower.',
    coordinates: { lat: 48.8584, lon: 2.2945 },
    country: 'France',
    timeZone: 'Europe/Paris',
    glimpse: 'The Eiffel Tower by night, lit in amber, with its famous sparkle.',
  },
];
