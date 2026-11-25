import type { MonumentStory } from '../types';

/**
 * San Francisco: the story of the Golden Gate Bridge, chapter by chapter (states in cities/san-francisco/stage/sanFranciscoConfig.ts).
 * Sources and what is still unconfirmed are in docs/briefs/san-francisco.md §7-8: the text does not say how the deck was assembled
 * (only that the halves met on 18 November 1936), gives no head count for the opening day and does not describe the Navy's pattern.
 */
export const story: MonumentStory = {
  city: 'San Francisco',
  cityLocal: 'San Francisco',
  cityLocalLang: 'en',
  motif: 'catenary',
  hero: {
    id: 'prologue',
    year: 'Prologue',
    name: 'The maquette',
    kicker: 'SAN FRANCISCO · 1933–1937',
    title: 'Golden Gate Bridge',
    titleLang: 'en',
    subtitle: 'A bridge across the Golden Gate strait',
    paragraphs: ['The Navy wanted it striped black and yellow. It got its color from the primer instead. Watch it rise from the strait, cable by cable.'],
    cta: 'Begin',
  },
  chapters: [
    {
      id: 'towers',
      year: '1933',
      name: 'The towers',
      kicker: '02 — The towers',
      title: 'Two towers in the strait',
      paragraphs: [
        'Work began on 5 January 1933. The Marin tower rose from November 1933; the San Francisco tower stands on a pier inside a fender wall finished in October 1934, and was completed on 28 June 1935.',
        'Each tower stands 227 m above the water.',
      ],
      facts: [
        { label: 'Work began', value: '5 Jan 1933' },
        { label: 'Height', value: '227 m' },
        { label: 'Second tower', value: '28 Jun 1935' },
      ],
    },
    {
      id: 'cables',
      year: '1935',
      name: 'The cables',
      kicker: '03 — The cables',
      title: '27,572 wires, spun in place',
      paragraphs: [
        'The cables were spun on site, from October 1935 to May 1936. Each one holds 61 strands of about 452 wires: 27,572 wires, and 129,000 km of wire between the two.',
        'Then the suspender ropes were hung from them: 250 pairs, 15 m apart.',
      ],
      facts: [
        { label: 'Wires per cable', value: '27,572' },
        { label: 'Wire in total', value: '129,000 km' },
        { label: 'Spun', value: 'Oct 1935 – May 1936' },
      ],
    },
    {
      id: 'deck',
      year: '1936',
      name: 'The deck',
      kicker: '04 — The deck',
      title: 'Meeting in the middle',
      paragraphs: ['The hanging structure was assembled from July to December 1936. The two halves of the main span met in the middle on 18 November 1936.'],
      facts: [
        { label: 'Halves joined', value: '18 Nov 1936' },
        { label: 'Main span', value: '1,280 m' },
        { label: 'Bridge width', value: '27 m' },
      ],
    },
    {
      id: 'net',
      year: '1937',
      name: 'The net',
      kicker: '05 — The net',
      title: 'Halfway to Hell',
      paragraphs: [
        'A manila rope net hung under the deck, from tower to tower. It saved 19 men, who called themselves the Halfway-to-Hell Club.',
        'Eleven men still died: Kermit Moore on 21 October 1936, and ten more on 17 February 1937, when a scaffold fell through the net. The bridge opened to pedestrians on 27 May 1937 and to vehicles the next day, with Roosevelt giving the signal by telegraph.',
      ],
      facts: [
        { label: 'Saved by the net', value: '19 men' },
        { label: 'Died', value: '11' },
        { label: 'Opened', value: '27–28 May 1937' },
      ],
    },
    {
      id: 'color',
      year: 'Today',
      name: 'The color',
      kicker: '06 — Today',
      title: 'The color nobody planned',
      paragraphs: [
        'The Navy asked for black and yellow stripes; others suggested aluminum or gray. The steel had arrived coated in red lead primer, and the architect Irving Morrow asked to keep that color: he argued it blended with the hills and contrasted with the ocean and the sky.',
        'Today it is International Orange, a shade that already existed in the aerospace industry to set things apart from their surroundings. It was never gold.',
      ],
      facts: [
        { label: 'The Navy wanted', value: 'Black and yellow' },
        { label: 'Primer', value: 'Red lead' },
        { label: 'Chosen by', value: 'Irving Morrow' },
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
          { id: 'stripes', label: 'The Navy’s stripes' },
          { id: '1936', label: '1936' },
        ],
        parts: [
          {
            id: 'tower',
            name: 'The towers',
            text: '227 m above the water. Irving Morrow gave them vertical ribs and an Art Deco look.',
          },
          {
            id: 'cable',
            name: 'The main cables',
            text: 'Each one is 0.92 m thick: 27,572 wires, spun on site.',
          },
          {
            id: 'hangers',
            name: 'The suspenders',
            text: '250 pairs of ropes, one every 15 m, hang the deck from the cables.',
          },
          {
            id: 'deck',
            name: 'The deck',
            text: 'The bridge is 27 m wide, 19 m of it roadway between the curbs. The original deck was replaced entirely, and the new one was finished on 15 August 1985.',
          },
          {
            id: 'pier',
            name: 'The south pier',
            text: 'The San Francisco tower stands on it, inside a fender wall finished on 24 October 1934.',
          },
          {
            id: 'anchorage',
            name: 'The anchorages',
            text: 'About 54,400 tonnes each. The cables end in them.',
          },
          {
            id: 'arch',
            name: 'Fort Point arch',
            text: 'A steel arch 97 m long carries the roadway over Fort Point, the historic fort, which it spared. Work on it began on 21 July 1936.',
          },
        ],
      },
    },
  ],
  label: {
    name: 'Golden Gate Bridge',
    nameLang: 'en',
    caption: 'Across the Golden Gate · San Francisco',
    lines: ['1933–1937 · Steel, International Orange', '2,737 m long', 'Scale 1:2000 · Inv. Nº 1937', '37.8199° N · 122.4783° W'],
  },
};
