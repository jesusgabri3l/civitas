import type { DestinationId } from './index';

/** SEO data of a page (title, description, Open Graph image). */
export interface PageMeta {
  path: string;
  title: string;
  description: string;
  ogImage: string;
  /** Alt text of the share image. */
  ogImageAlt: string;
}

export type Region = 'Europe' | 'Asia' | 'Africa' | 'Americas';

/** Identity of a city page (docs/ART-DIRECTION.md §4). Colors in hex; the 3D side reads `ground` and `accent` from here. */
export interface CityTheme {
  /** Background of the page; the 3D backdrop and fog use the same color. */
  ground: string;
  /** Lines, CTA border, timeline. */
  accent: string;
  /** The accent lifted for small text (contrast >= 4.5:1 on the ground). */
  accentStrong: string;
  /** CSS font stacks: one display face per city, Cormorant for reading in every city. */
  fontDisplay: string;
  fontBody: string;
  displayStyle?: 'italic';
  displayWeight?: number;
}

/**
 * The light, client-safe description of a city (no three, no story): globe, tooltip, index, router, SEO and theme. Each city has
 * one in `cities/<id>/meta.ts`; the list in `cities/index.ts` is what registers it.
 */
export interface CityMeta extends PageMeta {
  id: string;
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
  /** Monument index: when it was built (display string) and the year that sorts it (negative = BC). */
  date: string;
  year: number;
  region: Region;
  /** Extra words the index search matches (local names, aliases, other spellings). Optional: name, monument, country and region are already searched. */
  keywords?: readonly string[];
  theme: CityTheme;
  /** Cities that read as related: the globe prefers them for this city's arcs on hover. */
  related?: readonly DestinationId[];
}

/**
 * The story of a monument page (docs/ART-DIRECTION.md §5): a hero and six chapters, each one a state of the maquette (`stateFor` in
 * the stage config of the city, same order). Rendered by components/TheMonumentStory.astro. Site content in English.
 */
export interface StoryChapter {
  id: string;
  /** Timeline: year (mono) and short name. */
  year: string;
  name: string;
  kicker: string;
  title: string;
  /** Language of the title when it is not English (the hero's Greek). */
  titleLang?: string;
  paragraphs: string[];
  facts?: { label: string; value: string }[];
  /** Only the last chapter: what the visitor can do with the maquette. */
  explore?: ExploreContent;
}

/**
 * The Explore chapter: a hint, the views of the maquette (ids of the named states in the stage config; the first one is the
 * chapter's own state) and the parts that open a card when tapped (ids of the model's parts).
 */
export interface ExploreContent {
  hint: string;
  views: { id: string; label: string }[];
  parts: { id: string; name: string; text: string }[];
}

export interface StoryHero extends StoryChapter {
  subtitle: string;
  cta: string;
}

/** Museum label of the hero (bottom right). */
export interface MuseumLabel {
  name: string;
  nameLang: string;
  caption: string;
  lines: string[];
}

/** The fine graphic line under the hero title (docs/ART-DIRECTION.md §4): greek key, double rule, iron truss. */
export type StoryMotif = 'greek-key' | 'double-rule' | 'truss';

export interface MonumentStory {
  /** Top bar: the city in English and in its own name and script (`cityLocalLang`: its language tag). */
  city: string;
  cityLocal: string;
  cityLocalLang: string;
  motif: StoryMotif;
  hero: StoryHero;
  chapters: StoryChapter[];
  label: MuseumLabel;
}
