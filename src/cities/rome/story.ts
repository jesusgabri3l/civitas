import type { MonumentStory } from '../types';

/**
 * Rome: the story of the Colosseum, chapter by chapter (states in cities/rome/stage/romeConfig.ts).
 * Historical facts: VERIFY WITH SOURCES BEFORE PUBLISHING. TODO to check: the quarry at Tibur and its distance, the iron clamps, the start
 * under Vespasian (c. AD 72) over the site of Nero's lake, the opening by Titus in AD 80, the hundred days of games (Cassius Dio),
 * the 50,000 seats, the velarium crews, the earthquake of 1349 and the reuse of its stone, the buttresses of 1807 and 1827, the
 * restoration of 2013-2016 and the figures of the maquette (189 x 156 m, 48 m, 80 arches per ring, the arena).
 */
export const story: MonumentStory = {
  city: 'Rome',
  cityLocal: 'Roma',
  cityLocalLang: 'it',
  motif: 'double-rule',
  hero: {
    id: 'prologue',
    year: 'Prologue',
    name: 'The maquette',
    kicker: 'Piazza del Colosseo, Rome · AD 72–80',
    title: 'COLOSSEVM',
    titleLang: 'la',
    subtitle: 'The Colosseum',
    paragraphs: ['The great amphitheatre of Rome, seen at cold dawn as it stands today. Take it apart, raise it again and watch its outer ring fall.'],
    cta: 'Enter the arena',
  },
  chapters: [
    {
      id: 'tibur',
      year: 'Tibur',
      name: 'The quarry',
      kicker: 'II · Tibur',
      title: 'Stone from Tibur',
      paragraphs: [
        'The Colosseum is built mostly of travertine, a pale limestone quarried at Tibur, today’s Tivoli, some 30 km from Rome. The blocks were hauled in along a road made for the job and held together with iron clamps instead of mortar.',
        'Tuff, brick and concrete did the rest. Here the amphitheatre is taken apart into its layers: the arcades, the seating rings and the arena.',
      ],
      facts: [
        { label: 'Quarry', value: 'Tibur (Tivoli)' },
        { label: 'Distance', value: '~30 km' },
        { label: 'Stone', value: 'Travertine' },
      ],
    },
    {
      id: 'vespasian',
      year: 'AD 72',
      name: 'Vespasian',
      kicker: 'III · AD 72',
      title: 'Built in eight years',
      paragraphs: [
        'Around AD 72 the emperor Vespasian began the amphitheatre where Nero’s artificial lake had been: a place for public games on land Nero had taken for his palace, probably paid for with the spoils of the Jewish War. His son Titus opened it in AD 80, and Domitian finished it.',
        'It rises in four levels: three arcades of eighty arches each, under a solid attic. The half columns change from level to level, Tuscan, Ionic and Corinthian.',
      ],
      facts: [
        { label: 'Begun', value: 'c. AD 72' },
        { label: 'Opened', value: 'AD 80' },
        { label: 'Arches', value: '80 per level' },
      ],
    },
    {
      id: 'games',
      year: 'AD 80',
      name: 'The games',
      kicker: 'IV · AD 80',
      title: 'A hundred days of games',
      paragraphs: [
        'Titus opened it with games that, according to the historian Cassius Dio, lasted a hundred days. Around fifty thousand spectators sat by rank, the emperor and the senators nearest the arena.',
        'Over their heads, sailors worked a great awning, the velarium, to shade the seats. Here it unfurls from the masts of the attic.',
      ],
      facts: [
        { label: 'Games', value: '100 days' },
        { label: 'Seats', value: '~50,000' },
        { label: 'Awning', value: 'Velarium' },
      ],
    },
    {
      id: 'earthquake',
      year: '1349',
      name: 'The earthquake',
      kicker: 'V · 1349',
      title: 'The earthquake',
      paragraphs: [
        'Long after the last games the Colosseum became a fortress, a home and a quarry. In 1349 an earthquake brought down the outer ring on the south side, and its stone was carried off to build churches and palaces.',
        'What fell is marked here in color. Behind the missing wall the second ring comes into view, the one that still holds the seating up.',
      ],
      facts: [
        { label: 'Quake', value: '1349' },
        { label: 'Fell', value: 'South outer ring' },
        { label: 'Stone', value: 'Reused in Rome' },
      ],
    },
    {
      id: 'today',
      year: 'Today',
      name: 'Holding it together',
      kicker: 'VI · Today',
      title: 'Holding it together',
      paragraphs: [
        'The north side still stands to its full height; the south shows the inner ring through the gap. To stop the broken wall from going further, brick buttresses were built against its ends in 1807 and 1827. They are marked here in color.',
        'The facade was cleaned and restored in a project that ended in 2016. The arena, open to the hypogeum, shows the maze that once lay under the sand.',
      ],
      facts: [
        { label: 'Buttresses', value: '1807 · 1827' },
        { label: 'Restoration', value: '2013–2016' },
        { label: 'Still standing', value: 'North side' },
      ],
    },
    {
      id: 'explore',
      year: 'You',
      name: 'Explore',
      kicker: 'VII · Explore',
      title: 'Now, you',
      paragraphs: ['The whole story fits in one maquette. Turn it, switch between its states and tap its parts.'],
      explore: {
        hint: 'Drag to turn the maquette · tap a part',
        views: [
          { id: 'today', label: 'Today' },
          { id: 'built', label: 'AD 80' },
          { id: 'exploded', label: 'Apart' },
        ],
        parts: [
          {
            id: 'arcades',
            name: 'The arcades',
            text: 'Eighty arches on each of three levels, with half columns between them: Tuscan below, Ionic in the middle and Corinthian above. Numbered entrances let the crowd reach its seats and leave in minutes.',
          },
          {
            id: 'attic',
            name: 'The attic and the awning',
            text: 'The solid attic crowns the facade. Its corbels carried the masts of the velarium, the awning that shaded the seats and that sailors of the imperial fleet handled.',
          },
          {
            id: 'cavea',
            name: 'The seating',
            text: 'The bowl of seats was divided by rank: the emperor and the senators closest to the arena, then the knights, then the citizens, and at the top the poorest.',
          },
          {
            id: 'arena',
            name: 'The arena and hypogeum',
            text: 'The arena was a wooden floor covered in sand, which is what harena means in Latin. Beneath it ran the hypogeum, a maze of passages and lifts where animals, gladiators and scenery waited.',
          },
          {
            id: 'buttress',
            name: 'The buttresses',
            text: 'After the earthquakes the south wall stood broken. In 1807 and 1827 brick buttresses were raised against the ends of the break to keep the rest from falling. They are the red you see on the ruin.',
          },
        ],
      },
    },
  ],
  label: {
    name: 'COLOSSEVM',
    nameLang: 'la',
    caption: 'Amphitheatrum Flavium · Rome',
    lines: ['AD 72–80 · Travertine, tuff, brick', 'Elliptical, 189 × 156 m', 'Scale 1:250 · Inv. Nº 0080', '41.8902° N · 12.4922° E'],
  },
};
