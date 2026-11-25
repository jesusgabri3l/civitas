// Server only (layout and views): what the client must never bundle, the stories and the fonts.
import type { Lang } from '../i18n/lang';
import { fontPreloads as athensFonts } from './athens/fonts';
import { story as athensStory } from './athens/story';
import { story as athensStoryEs } from './athens/story.es';
import type { DestinationId } from './index';
import { fontPreloads as newYorkFonts } from './new-york/fonts';
import { story as newYorkStory } from './new-york/story';
import { story as newYorkStoryEs } from './new-york/story.es';
import { fontPreloads as parisFonts } from './paris/fonts';
import { story as parisStory } from './paris/story';
import { story as parisStoryEs } from './paris/story.es';
import { fontPreloads as romeFonts } from './rome/fonts';
import { story as romeStory } from './rome/story';
import { story as romeStoryEs } from './rome/story.es';
import { fontPreloads as sanFranciscoFonts } from './san-francisco/fonts';
import { story as sanFranciscoStory } from './san-francisco/story';
import { story as sanFranciscoStoryEs } from './san-francisco/story.es';
import type { MonumentStory } from './types';

/** The story of each monument that has its page built, per language. A city without one shows its stage alone. */
export const monumentStories: Record<Lang, Partial<Record<DestinationId, MonumentStory>>> = {
  en: { athens: athensStory, rome: romeStory, paris: parisStory, 'new-york': newYorkStory, 'san-francisco': sanFranciscoStory },
  es: { athens: athensStoryEs, rome: romeStoryEs, paris: parisStoryEs, 'new-york': newYorkStoryEs, 'san-francisco': sanFranciscoStoryEs },
};

/** Fonts to preload on the page of each city (all their CSS is imported here, so SPA navigation finds them ready). */
export const fontPreloads: Record<DestinationId, string[]> = {
  athens: athensFonts,
  rome: romeFonts,
  paris: parisFonts,
  'new-york': newYorkFonts,
  'san-francisco': sanFranciscoFonts,
};
