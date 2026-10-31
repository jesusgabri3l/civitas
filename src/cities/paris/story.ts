import type { MonumentStory } from '../types';

/**
 * Paris: the story of the Eiffel Tower, chapter by chapter (states in cities/paris/stage/parisConfig.ts).
 * Historical facts: VERIFY WITH SOURCES BEFORE PUBLISHING. TODO to check: the 1884 sketch and Sauvestre's role, the 2 years 2 months
 * 5 days, the rivet and parts counts, 1889 lighting, the radio story of 1909, the 330 m antenna of 2022, the sparkle (2000,
 * 5 minutes, ~20,000 bulbs), repainting (every ~7 years), the 39 m arches, the levels and the steps.
 */
export const story: MonumentStory = {
  city: 'Paris',
  cityLocal: 'Paris',
  cityLocalLang: 'fr',
  motif: 'truss',
  hero: {
    id: 'prologue',
    year: 'Prologue',
    name: 'The maquette',
    kicker: 'Champ de Mars, Paris · 1887–1889',
    title: 'La Tour Eiffel',
    titleLang: 'fr',
    subtitle: 'The Eiffel Tower',
    paragraphs: ['A wrought-iron lattice raised for the 1889 World’s Fair. Take it apart, girder by girder; at night, the tower is its own light.'],
    cta: 'Climb the tower',
  },
  chapters: [
    {
      id: 'sketch',
      year: '1884',
      name: 'The sketch',
      kicker: '02 — The drawing',
      title: 'Drawn before it was built',
      paragraphs: [
        'In 1884 two engineers of Gustave Eiffel’s company, Maurice Koechlin and Émile Nouguier, sketched a pylon of iron lattice 300 m high. The architect Stephen Sauvestre gave it its great arches.',
        'Eiffel bought the patent rights and his design won the competition for the 1889 World’s Fair. About 18,000 iron parts were drawn one by one. Here it is on paper, drawn from the ground up.',
      ],
      facts: [
        { label: 'Engineers', value: 'Koechlin · Nouguier' },
        { label: 'Architect', value: 'Sauvestre' },
        { label: 'Parts', value: '18,038' },
      ],
    },
    {
      id: 'construction',
      year: '1887–89',
      name: 'Construction',
      kicker: '03 — Construction',
      title: 'Two years, two months',
      paragraphs: [
        'Work began on 28 January 1887 and ended on 31 March 1889. The parts were made in Eiffel’s workshops at Levallois-Perret and riveted together on site, level by level, from the four piers up.',
        'About 2.5 million rivets hold about 7,300 tonnes of puddled iron. Level by level, from the ground up, it rose in place.',
      ],
      facts: [
        { label: 'Start', value: '28 Jan 1887' },
        { label: 'Finished', value: '31 Mar 1889' },
        { label: 'Rivets', value: '~2.5 million' },
      ],
    },
    {
      id: 'fair',
      year: '1889',
      name: 'World’s Fair',
      kicker: '04 — 1889',
      title: 'The gate of the fair',
      paragraphs: [
        'The tower was the entrance of the 1889 Exposition Universelle, a hundred years after the French Revolution. At 300 m it was the tallest structure in the world, and it kept the title until 1930.',
        'At night it was lit by gas lamps along its edges and a beacon at the summit.',
      ],
      facts: [
        { label: 'Opened', value: '31 Mar 1889' },
        { label: 'Height', value: '300 m' },
        { label: 'Record', value: 'Until 1930' },
      ],
    },
    {
      id: 'radio',
      year: '1909',
      name: 'Saved by radio',
      kicker: '05 — 1909',
      title: 'Meant to last twenty years',
      paragraphs: [
        'The permit was for twenty years, so in 1909 the city could have torn the tower down. By then it had a second job: wireless experiments from its top had grown into a radio station.',
        'The antenna made it too useful to remove. Its mast has been replaced several times; today’s, installed in 2022, makes the tower 330 m tall.',
      ],
      facts: [
        { label: 'Permit', value: '20 years' },
        { label: 'Reprieve', value: '1909' },
        { label: 'Height today', value: '330 m' },
      ],
    },
    {
      id: 'today',
      year: 'Today',
      name: 'The sparkle',
      kicker: '06 — Today',
      title: 'Every hour, five minutes',
      paragraphs: [
        'It began as a show for the year 2000, and Parisians would not let it end. Since then, for five minutes at the start of every hour after dark, about 20,000 bulbs make the tower sparkle.',
        'Here it sparkles on demand, and by itself at the top of every hour in Paris. Every seven years or so the iron is repainted by hand, in three shades that lighten toward the summit.',
      ],
      facts: [
        { label: 'Show', value: '5 min / hour' },
        { label: 'Bulbs', value: '~20,000' },
        { label: 'Repainted', value: '~Every 7 years' },
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
        hint: 'Drag to turn the maquette · tap a part',
        views: [
          { id: 'today', label: 'Today' },
          { id: 'built', label: '1889' },
          { id: 'sparkle', label: 'Sparkle' },
          { id: 'exploded', label: 'Apart' },
        ],
        parts: [
          {
            id: 'piers',
            name: 'The four piers',
            text: 'Four lattice piers stand at the corners of a square about 125 m wide and lean inward along a curve Eiffel said the wind itself dictated. They meet at the second level.',
          },
          {
            id: 'arches',
            name: 'The great arches',
            text: 'The arches between the piers carry no load worth speaking of: they are mostly decoration, a signature of the architect Sauvestre. They rise about 39 m.',
          },
          {
            id: 'levels',
            name: 'The three levels',
            text: 'Visitors reach three levels: the first at about 57 m, the second at about 116 m and the top at about 276 m. The stairs to the top are around 1,665 steps.',
          },
          {
            id: 'shaft',
            name: 'The shaft',
            text: 'Above the second level the four piers have merged into one tapering shaft. It ends at the summit, 300 m up, under the beacon room.',
          },
          {
            id: 'mast',
            name: 'The antenna',
            text: 'The mast is what changed after 1909: first for wireless, later for radio and television. The tower grew from 300 m to 330 m with it.',
          },
        ],
      },
    },
  ],
  label: {
    name: 'La Tour Eiffel',
    nameLang: 'fr',
    caption: 'Eiffel Tower · Paris',
    lines: ['1887–1889 · Puddled iron', 'Wrought-iron lattice tower', 'Scale 1:1000 · Inv. Nº 1889', '48.8584° N · 2.2945° E'],
  },
};
