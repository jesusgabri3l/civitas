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
}

export const home: PageMeta & { intro: string } = {
  path: '/',
  title: 'WorldHub — the world’s monuments in 3D',
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
    title: 'Athens and the Parthenon in 3D — WorldHub',
    description: 'The Parthenon at golden hour: light, dust and the story of the Acropolis of Athens, in 3D.',
    ogImage: '/og/athens.svg',
    intro: 'Athens, golden hour over the Acropolis.',
  },
  {
    id: 'rome',
    path: '/rome',
    name: 'Rome',
    monument: 'Colosseum',
    title: 'Rome and the Colosseum in 3D — WorldHub',
    description: 'The Colosseum at cold dawn, wrapped in mist, with its fourth tier restored, in 3D.',
    ogImage: '/og/rome.svg',
    intro: 'Rome, a cold dawn over the Colosseum.',
  },
  {
    id: 'paris',
    path: '/paris',
    name: 'Paris',
    monument: 'Eiffel Tower',
    title: 'Paris and the Eiffel Tower in 3D — WorldHub',
    description: 'The Eiffel Tower by night, lit in amber, with its famous sparkle, in 3D.',
    ogImage: '/og/paris.svg',
    intro: 'Paris, an amber night around the Eiffel Tower.',
  },
];
