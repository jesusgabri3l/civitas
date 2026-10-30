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
