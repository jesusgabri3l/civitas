import type { DestinationId } from '../destinations';
import { athens } from './athens';
import { paris } from './paris';
import { rome } from './rome';
import type { MonumentStory } from './types';

export type { ExploreContent, MonumentStory, StoryChapter, StoryHero, MuseumLabel, StoryMotif } from './types';

/** The story of each monument that has its page built. A city without one shows its stage alone. */
export const monumentStories: Partial<Record<DestinationId, MonumentStory>> = { athens, rome, paris };
