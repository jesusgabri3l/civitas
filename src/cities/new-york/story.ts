import type { MonumentStory } from '../types';

/**
 * New York: the story of the Statue of Liberty, chapter by chapter (states in cities/new-york/stage/newYorkConfig.ts).
 * Sources and the dates to state exactly are in docs/briefs/new-york.md §7-8 ("about thirty years", "until 1902", 17 June 1885).
 */
export const story: MonumentStory = {
  city: 'New York',
  cityLocal: 'New York',
  cityLocalLang: 'en',
  motif: 'crown-rays',
  hero: {
    id: 'prologue',
    year: 'Prologue',
    name: 'The maquette',
    kicker: 'Liberty Island, New York · 1875–1886',
    title: 'Liberty Enlightening the World',
    titleLang: 'en',
    subtitle: 'The Statue of Liberty',
    paragraphs: ['A gift from France, raised in copper over New York Harbor. Open her skin, find the skeleton inside and watch her turn from the brown of a new penny to green.'],
    cta: 'Meet Liberty',
  },
  chapters: [
    {
      id: 'skeleton',
      year: '1880–81',
      name: 'Eiffel’s skeleton',
      kicker: '02 — The skeleton',
      title: 'A skin on a skeleton',
      paragraphs: [
        'Frédéric Auguste Bartholdi sculpted her, but a skin cannot stand by itself. Gustave Eiffel was hired in 1879 to design what holds her up, and the first rivet went in in 1881.',
        'An iron pylon carries the weight, and a flexible armature reaches from it to the skin. The skin is copper just 2.37 mm thick, hammered by hand into about 300 sheets; it hangs from the skeleton instead of holding itself up.',
      ],
      facts: [
        { label: 'Engineer', value: 'Gustave Eiffel' },
        { label: 'Skin', value: '2.37 mm' },
        { label: 'Sheets', value: '~300' },
      ],
    },
    {
      id: 'paris',
      year: '1884',
      name: 'Paris',
      kicker: '03 — Paris',
      title: 'Built in Paris first',
      paragraphs: [
        'Before she crossed the ocean she was built whole in Paris. Her torch hand had been shown in Philadelphia in 1876 and her head in Paris in 1878.',
        'On 4 July 1884 she was presented there, finished and still bright copper, with no pedestal under her.',
      ],
      facts: [
        { label: 'Torch hand', value: 'Philadelphia, 1876' },
        { label: 'Head', value: 'Paris, 1878' },
        { label: 'Presented', value: '4 Jul 1884' },
      ],
    },
    {
      id: 'crates',
      year: '1885',
      name: '350 pieces',
      kicker: '04 — Crossing',
      title: 'Shipped in 214 crates',
      paragraphs: [
        'To cross the Atlantic she was taken apart into 350 pieces and packed in 214 crates. The French frigate Isère carried them into New York Harbor on 17 June 1885.',
        'The pedestal was not ready. Joseph Pulitzer’s donation campaign of 1885 rescued the work, and Richard Morris Hunt’s pedestal rose over Fort Wood, the star-shaped fort of 1811.',
      ],
      facts: [
        { label: 'Pieces', value: '350' },
        { label: 'Crates', value: '214' },
        { label: 'Arrived', value: '17 Jun 1885' },
      ],
    },
    {
      id: 'dedication',
      year: '1886',
      name: 'Dedication',
      kicker: '05 — Dedication',
      title: 'A lighthouse for the harbor',
      paragraphs: [
        'She was put back together on her pedestal and dedicated on 28 October 1886. Her torch was lit as a real light for ships, and she served as an official lighthouse until 1902.',
        'She was not green yet: in 1886 she was brown, like a new penny.',
      ],
      facts: [
        { label: 'Dedicated', value: '28 Oct 1886' },
        { label: 'Lighthouse', value: 'Until 1902' },
        { label: 'To the torch', value: '93 m' },
      ],
    },
    {
      id: 'patina',
      year: 'Today',
      name: 'The patina',
      kicker: '06 — Today',
      title: 'Why she turned green',
      paragraphs: [
        'Copper reacts with air, rain and sea salt, and slowly grows a thin green layer. On Liberty it took about thirty years.',
        'That layer is not damage: it protects the metal under it. The torch you see today is a replica covered in gold leaf, from 1986; the original has been in the island’s museum since 2019.',
      ],
      facts: [
        { label: 'Skin', value: '2.37 mm' },
        { label: 'The change', value: '~30 years' },
        { label: 'Torch', value: 'Gold leaf, 1986' },
      ],
    },
    {
      id: 'explore',
      year: 'You',
      name: 'Explore',
      kicker: '07 — Explore',
      title: 'Now, you',
      paragraphs: ['The whole story fits in one maquette. Turn it, switch between its states and tap its parts.'],
      explore: {
        credit: { text: 'Statue model: gravityjack (Sketchfab), CC BY 4.0', href: 'https://sketchfab.com/3d-models/84094e8d5e724b5c882cf576ca12e44e' },
        hint: 'Drag to turn the maquette · tap a part',
        views: [
          { id: 'today', label: 'Today' },
          { id: '1886', label: '1886' },
          { id: 'skeleton', label: 'Skeleton' },
        ],
        parts: [
          {
            id: 'torch',
            name: 'The torch',
            text: 'Today’s flame is a replica covered in gold leaf, made in 1986. The original has been in the museum on the island since 2019.',
          },
          {
            id: 'crown',
            name: 'The crown',
            text: 'Seven rays and 25 windows crown her head.',
          },
          {
            id: 'tablet',
            name: 'The tablet',
            text: 'She holds a tablet marked JULY IV MDCCLXXVI: the date of the Declaration of Independence, 4 July 1776.',
          },
          {
            id: 'skin',
            name: 'The skin',
            text: 'Copper sheets 2.4 mm thick, hammered by hand over a form, a technique called repoussé.',
          },
          {
            id: 'pylon',
            view: 'skeleton',
            name: 'Eiffel’s pylon',
            text: 'A flexible iron skeleton. The skin hangs from it and cannot hold itself up.',
          },
          {
            id: 'pedestal',
            name: 'The pedestal',
            text: 'Designed by Richard Morris Hunt. The work was rescued in 1885 by Joseph Pulitzer’s donation campaign.',
          },
          {
            id: 'fort',
            name: 'Fort Wood',
            text: 'The 11-pointed star-shaped fort of 1811 on which she stands.',
          },
        ],
      },
    },
  ],
  label: {
    name: 'Liberty Enlightening the World',
    nameLang: 'en',
    caption: 'Statue of Liberty · New York',
    lines: ['1875–1886 · Copper over an iron frame', '93 m to the torch', 'Scale 1:300 · Inv. Nº 1886', '40.6892° N · 74.0445° W'],
  },
};
