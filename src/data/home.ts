import type { PageMeta } from '../cities/types';

/** The hub: the page of the globe. No counts or full lists here: they go stale as cities are added (the full list is the ItemList of `jsonLd.ts`). */
export const home: PageMeta & { intro: string } = {
  path: '/',
  title: 'Civitas — the world’s monuments in interactive 3D',
  description:
    'Spin the globe and explore the world’s monuments in interactive 3D, from the Parthenon to the Eiffel Tower: each story told by taking it apart.',
  ogImage: '/og/home.jpg',
  ogImageAlt: 'A night globe with amber points marking the monuments to visit.',
  intro: 'Spin the globe and pick a destination to step inside.',
};
