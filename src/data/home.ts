import type { PageMeta } from '../cities/types';

/** The hub: the page of the globe. */
export const home: PageMeta & { intro: string } = {
  path: '/',
  title: 'Civitas — the world’s monuments in interactive 3D',
  description:
    'Spin the globe and explore the Parthenon, the Colosseum and the Eiffel Tower in interactive 3D: the story of each monument, told by taking it apart.',
  ogImage: '/og/home.jpg',
  ogImageAlt: 'A globe with three monuments on it: the Parthenon, the Colosseum and the Eiffel Tower.',
  intro: 'One globe, three monuments. Pick a destination to step inside.',
};
