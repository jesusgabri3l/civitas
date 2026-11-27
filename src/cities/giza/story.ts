import type { MonumentStory } from '../types';

/**
 * Giza: the story of the Great Pyramid, chapter by chapter (states in cities/giza/stage/gizaConfig.ts).
 * Sources and what is still unconfirmed are in docs/briefs/giza.md §7-8: the text does not say how the blocks were raised, gives no
 * count of years for the work, does not say which buildings of Cairo got the stones and does not name the building that overtook the
 * pyramid in height.
 */
export const story: MonumentStory = {
  city: 'Giza',
  cityLocal: 'Giza',
  cityLocalLang: 'en',
  motif: 'courses',
  hero: {
    id: 'prologue',
    year: 'Prologue',
    name: 'The maquette',
    kicker: 'GIZA · C. 2560 BC',
    title: 'Akhet Khufu',
    titleLang: 'egy-Latn',
    subtitle: 'The Great Pyramid of Giza',
    paragraphs: ['It was once smooth and white, one polished face of limestone from base to tip. Most of that skin is gone. Watch it rise course by course, and put it back.'],
    cta: 'Begin',
  },
  chapters: [
    {
      id: 'plateau',
      year: 'c. 2560 BC',
      name: 'The plateau',
      kicker: '02 — The plateau',
      title: 'A square aimed at the stars',
      paragraphs: [
        'Built for the pharaoh Khufu (Fourth Dynasty), around 2560 BC. The base, 230.3 m on each side, misses the cardinal points by less than 4′ of arc (under a tenth of a degree).',
        'The stone came from three places: the core, from quarries on the plateau itself; the fine white limestone, from Tura, across the Nile; and the granite, from Aswan, more than 900 km to the south.',
      ],
      facts: [
        { label: 'Base', value: '230.3 m' },
        { label: 'Off the cardinal points', value: '< 4′' },
        { label: 'Granite from', value: 'Aswan, 900+ km' },
      ],
    },
    {
      id: 'courses',
      year: 'c. 2560 BC',
      name: 'The courses',
      kicker: '03 — The courses',
      title: 'Course by course',
      paragraphs: [
        'About 2.3 million blocks (an estimate) and some 6 million tonnes of stone. Inside, the Grand Gallery (46.7 m long, 8.6 m high) climbs to the King’s Chamber, lined in granite (10.5 × 5.2 m) and roofed with nine slabs that weigh about 400 t together.',
        'Above it, five relieving chambers. In them the work gangs painted their names with Khufu’s: “The gang: the white crown of Khnum-Khufu is powerful.” How the blocks were raised is still debated.',
      ],
      facts: [
        { label: 'Blocks', value: '≈ 2.3 million' },
        { label: 'Stone', value: '≈ 6 million t' },
        { label: 'Grand Gallery', value: '46.7 m' },
      ],
    },
    {
      id: 'casing',
      year: 'Late reign',
      name: 'The casing',
      kicker: '04 — The casing',
      title: 'Khufu’s Horizon',
      paragraphs: [
        'Late in Khufu’s reign (year 26 or 27), the inspector Merer and about 40 men carried white Tura limestone to Giza by boat. His logbook, found in 2013 at Wadi al-Jarf, is the oldest inscribed papyrus known, and it calls the pyramid Akhet Khufu, “Khufu’s Horizon”.',
        'Finished, it stood 146.6 m (280 royal cubits) and, for more than 3,700 years, it was the tallest thing humans had built.',
      ],
      facts: [
        { label: 'Original height', value: '146.6 m' },
        { label: 'Slope', value: '51°50′40″' },
        { label: 'Tallest for', value: '> 3,700 years' },
      ],
    },
    {
      id: 'stripped',
      year: '1303',
      name: 'The stripping',
      kicker: '05 — The stripping',
      title: 'The skin goes to Cairo',
      paragraphs: [
        'Tradition attributes to the caliph al-Ma’mun, around 832, the tunnel visitors use today (many historians think it is older). On 8 August 1303 an earthquake shook much of the casing loose, and the fallen stones were later carried off to build in Cairo.',
        'Today it stands 138.5 m: about 8 m of its tip are missing.',
      ],
      facts: [
        { label: 'Earthquake', value: '8 Aug 1303' },
        { label: 'Height today', value: '138.5 m' },
        { label: 'Missing', value: '≈ 8 m' },
      ],
    },
    {
      id: 'today',
      year: '2017',
      name: 'The void',
      kicker: '06 — The void',
      title: 'What the muons saw',
      paragraphs: [
        'In 2017 the ScanPyramids team found, with muons (particles from cosmic rays that cross stone), a void at least 30 m long above the Grand Gallery, with a similar cross-section. Its purpose is unknown.',
        'In 2023 the team confirmed a corridor of about 9 m behind the north face and looked into it with an endoscopic camera.',
      ],
      facts: [
        { label: 'Big Void', value: '≥ 30 m' },
        { label: 'North corridor', value: '≈ 9 m' },
        { label: 'Found', value: '2017' },
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
          { id: 'cased', label: 'c. 2560 BC' },
          { id: 'inside', label: 'Inside' },
        ],
        parts: [
          {
            id: 'casing',
            name: 'The casing',
            text: 'Fine white limestone from Tura, brought by boat down the Nile. A few stones are left at the foot of the north face.',
            view: 'cased',
          },
          {
            id: 'core',
            name: 'The core',
            text: 'Some 200 courses of limestone from the plateau itself. It is what you see today.',
            view: 'today',
          },
          {
            id: 'entrance',
            name: 'The entrance',
            text: 'The original entrance, in the north face, under chevron slabs. Behind it is the corridor confirmed in 2023.',
            view: 'today',
          },
          {
            id: 'tunnel',
            name: 'The robbers’ tunnel',
            text: 'Where visitors enter today. Tradition attributes it to al-Ma’mun, around 832.',
            view: 'today',
          },
          {
            id: 'gallery',
            name: 'The Grand Gallery',
            text: '46.7 m long and 8.6 m high, roofed with a corbelled vault.',
            view: 'inside',
          },
          {
            id: 'kings-chamber',
            name: 'The King’s Chamber',
            text: 'Lined in Aswan granite, with five relieving chambers above it, where the work gangs painted their names.',
            view: 'inside',
          },
          {
            id: 'void',
            name: 'The Big Void',
            text: 'Found with muons in 2017: at least 30 m long. Nobody knows what it is for.',
            view: 'inside',
          },
        ],
      },
    },
  ],
  label: {
    name: 'Akhet Khufu',
    nameLang: 'egy-Latn',
    caption: 'The Great Pyramid of Giza · Giza',
    lines: ['c. 2560 BC · Limestone and granite, Tura casing', '146.6 m, today 138.5 m', 'Scale 1:1000 · Inv. Nº 0027', '29.9792° N · 31.1342° E'],
  },
};
