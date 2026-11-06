import type { MonumentStory } from '../types';

/**
 * Athens: the story of the Parthenon, chapter by chapter (states in cities/athens/stage/athensConfig.ts).
 * Historical facts: VERIFY WITH SOURCES BEFORE PUBLISHING (dates, figures, the restoration and polychromy claims).
 */
export const story: MonumentStory = {
  city: 'Athens',
  cityLocal: 'Αθήναι',
  cityLocalLang: 'el',
  motif: 'greek-key',
  hero: {
    id: 'prologue',
    year: 'Prologue',
    name: 'The maquette',
    kicker: 'Acropolis of Athens · 447–432 BC',
    title: 'ΠΑΡΘΕΝΩΝ',
    titleLang: 'el',
    subtitle: 'The Parthenon',
    paragraphs: ['The temple of Athena Parthenos, raised in Pentelic marble above the city. Take it apart, piece by piece, and follow its story to the present day.'],
    cta: 'Walk through the temple',
  },
  chapters: [
    {
      id: 'pentelikon',
      year: 'c. 447 BC',
      name: 'Pentelikon',
      kicker: '02 — Mount Pentelikon',
      title: 'Cut from the mountain',
      paragraphs: [
        'Every block came from the quarries of Mount Pentelikon, about 16 km northeast of the Acropolis. Its fine white marble, with a trace of iron, weathers to a warm honey tone.',
        'Drums, beams and roof slabs were roughed out at the quarry, hauled to the city and finished on site. Here is the temple, taken apart into the pieces it was made of.',
      ],
      facts: [
        { label: 'Quarry', value: 'Pentelikon' },
        { label: 'Distance', value: '~16 km' },
        { label: 'Stone', value: 'Marble' },
      ],
    },
    {
      id: 'pericles',
      year: '447–432 BC',
      name: 'Pericles',
      kicker: '03 — Pericles',
      title: 'Raised in fifteen years',
      paragraphs: [
        'Under Pericles, the architects Ictinus and Callicrates laid out the temple and Phidias directed its sculpture. Each of the 46 outer columns is a stack of marble drums.',
        'It was dedicated in 438 BC and its sculptures were finished by 432 BC. It was not white: like other Greek temples, its details were painted, and in 2023 traces of Egyptian blue were found on the garments of its pediment figures.',
      ],
      facts: [
        { label: 'Architects', value: 'Ictinus · Callicrates' },
        { label: 'Sculpture', value: 'Phidias' },
        { label: 'Columns', value: '8 × 17' },
      ],
    },
    {
      id: 'explosion',
      year: '1687',
      name: 'The explosion',
      kicker: '04 — 1687',
      title: 'The explosion',
      paragraphs: [
        'By 1687 the Parthenon had been a church and then a mosque, and the Ottoman garrison kept its gunpowder inside.',
        'During the Venetian siege a mortar round struck the temple. The blast tore open the cella and brought down much of both long colonnades.',
      ],
      facts: [
        { label: 'Date', value: '26 Sep 1687' },
        { label: 'Siege', value: 'Venetian' },
        { label: 'Command', value: 'F. Morosini' },
      ],
    },
    {
      id: 'marbles',
      year: '1801',
      name: 'The marbles',
      kicker: '05 — 1801–1812',
      title: 'The marbles leave',
      paragraphs: [
        'Between 1801 and 1812, agents of Lord Elgin removed about half of the surviving sculpture: pediment figures, metopes and much of the Ionic frieze.',
        'Most of it was shipped to Britain and is in the British Museum today. Greece has long asked for its return.',
      ],
      facts: [
        { label: 'Years', value: '1801–1812' },
        { label: 'Taken', value: 'Pediments · frieze' },
        { label: 'Today', value: 'British Museum' },
      ],
    },
    {
      id: 'today',
      year: 'Today',
      name: 'Restoration',
      kicker: '06 — Today',
      title: 'Rebuilding, carefully',
      paragraphs: [
        'The Acropolis has been under restoration since 1975. Fallen blocks are identified, mended with new Pentelic marble and set back in place, as on the north colonnade.',
        'The work is partial by design: much of the temple will never be rebuilt. In 2009 the Acropolis Museum opened at the foot of the rock to show the surviving sculptures.',
      ],
      facts: [
        { label: 'Restoration', value: 'Since 1975' },
        { label: 'Museum', value: '2009' },
        { label: 'Repairs', value: 'New marble' },
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
          { id: 'built', label: '432 BC' },
          { id: 'painted', label: 'Painted' },
          { id: 'exploded', label: 'Apart' },
        ],
        parts: [
          {
            id: 'column',
            name: 'Doric column',
            text: 'Forty-six outer columns about 10.4 m tall, each a stack of marble drums fluted on site with 20 flutes. They swell slightly toward the middle (entasis) and lean a little inward.',
          },
          {
            id: 'frieze',
            name: 'Entablature and frieze',
            text: 'Above the columns, triglyphs alternate with 92 carved metopes: gods against giants, Greeks against Amazons, Lapiths against centaurs and the fall of Troy.',
          },
          {
            id: 'pediment',
            name: 'Pediments',
            text: 'The east pediment showed the birth of Athena; the west one, her contest with Poseidon for Attica. Most surviving figures are in London and in the Acropolis Museum.',
          },
          {
            id: 'cella',
            name: 'Cella',
            text: 'The inner hall held the gold and ivory statue of Athena Parthenos by Phidias, about 12 m tall. A smaller room behind it kept the treasury.',
          },
          {
            id: 'crepidoma',
            name: 'Steps and stylobate',
            text: 'Three steps lift the temple. The top one, the stylobate, rises a few centimeters toward the middle of each side: one of the optical refinements of the building.',
          },
        ],
      },
    },
  ],
  label: {
    name: 'ΠΑΡΘΕΝΩΝ',
    nameLang: 'el',
    caption: 'Parthenon · Athens',
    lines: ['447–432 BC · Pentelic marble', 'Doric temple to Athena', 'Scale 1:200 · Inv. Nº 0447', '37.9715° N · 23.7267° E'],
  },
};
