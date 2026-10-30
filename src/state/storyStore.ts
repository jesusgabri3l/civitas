import { atom } from 'nanostores';

/** Where the scroll story is: chapter index (0-based) and progress inside it (0..1). Written by `story/storyScroll`, read by the engine. */
export interface StoryProgress {
  chapter: number;
  t: number;
}

const TOLERANCE = 0.002;

export const $story = atom<StoryProgress>({ chapter: 0, t: 0 });

/** Publishes the progress, skipping changes too small to move the camera. */
export function setStoryProgress(chapter: number, t: number) {
  const clamped = Math.min(1, Math.max(0, t));
  const current = $story.get();
  if (current.chapter === chapter && Math.abs(current.t - clamped) < TOLERANCE) return;
  $story.set({ chapter, t: clamped });
}

/** Back to the top of the story: first chapter, default view, no card open. */
export function resetStoryProgress() {
  $story.set({ chapter: 0, t: 0 });
  $exploreView.set(null);
  $explorePart.set(null);
}

/** Explore chapter: the view of the monument the visitor picked (a named state, e.g. `today`, `built`) and the part card open. */
export const $exploreView = atom<string | null>(null);
export const $explorePart = atom<string | null>(null);
