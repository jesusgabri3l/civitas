// Server only (layout and views): what the client must never bundle, the stories and the fonts.
import { fontPreloads as athensFonts } from './athens/fonts';
import { story as athensStory } from './athens/story';
import type { DestinationId } from './index';
import { fontPreloads as parisFonts } from './paris/fonts';
import { story as parisStory } from './paris/story';
import { fontPreloads as romeFonts } from './rome/fonts';
import { story as romeStory } from './rome/story';
import type { MonumentStory } from './types';

/** The story of each monument that has its page built. A city without one shows its stage alone. */
export const monumentStories: Partial<Record<DestinationId, MonumentStory>> = {
  athens: athensStory,
  rome: romeStory,
  paris: parisStory,
};

/** Fonts to preload on the page of each city (all their CSS is imported here, so SPA navigation finds them ready). */
export const fontPreloads: Record<DestinationId, string[]> = {
  athens: athensFonts,
  rome: romeFonts,
  paris: parisFonts,
};
