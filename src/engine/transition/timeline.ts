/**
 * The crossing between two stages, as pure functions of one progress `t` (0..1) from the leaving stage to the arriving one.
 * Turning back mid-way plays the same timeline backwards (the engine only flips the direction).
 * Entering a city, a snapshot of the globe stays over the city while a circle opens in it from the city. Leaving it, the
 * globe is live at once and a snapshot of the city closes over it in a circle that shrinks into the city.
 */
export type TransitionMode = 'enter' | 'exit' | 'fade';

export interface TransitionSample {
  /** 0..1 how deep the globe camera has dived (0 at rest, 1 at the closest point). */
  zoom: number;
  /** 0..1 how far a city is from rest while it settles in. */
  cityAway: number;
  /** 0..1 how visible the arriving stage is; the snapshot of the leaving one has `1 - mix`. */
  mix: number;
  /** 0..1 how far the circle around the anchor has gone: opened in the snapshot, or closed over it when leaving (0 = none). */
  reveal: number;
  /** Scale of the snapshot around the anchor. */
  snapScale: number;
}

/** Tuned by eye: 0.35x of the first 1.2 s version (0.25x felt slow, 0.5x rushed). */
export const ENTER_SECONDS = 1.2 / 0.35;
export const EXIT_SECONDS = 2.4;
export const FADE_SECONDS = 0.3;

const ENTER_SWAP_AT = 0.4;
/** Leaving and fading swap on the second frame: the first one only captures the stage that leaves. */
const FADE_SWAP_AT = 0.02;

const ENTER_SNAP_SCALE = 1.5;
/** Leaving a city its snapshot shrinks a little toward the city as the circle closes. */
const EXIT_SNAP_SCALE = 0.85;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const span = (t: number, from: number, to: number) => clamp01((t - from) / (to - from));
const smooth = (x: number) => x * x * (3 - 2 * x);
const easeInOut = smooth;
const easeOut = (x: number) => 1 - (1 - x) * (1 - x) * (1 - x);

/** Globe -> city: the globe camera dives, the scenes swap, and the city fades in under a growing snapshot of the globe. */
function enterSample(t: number): TransitionSample {
  return {
    zoom: easeInOut(span(t, 0, 0.45)),
    cityAway: 1 - easeOut(span(t, ENTER_SWAP_AT, 1)),
    mix: smooth(span(t, ENTER_SWAP_AT, 0.85)),
    reveal: easeInOut(span(t, ENTER_SWAP_AT, 0.9)),
    snapScale: 1 + (ENTER_SNAP_SCALE - 1) * easeOut(span(t, ENTER_SWAP_AT, 1)),
  };
}

/** City -> globe: the globe pulls back from the dive while the snapshot of the city closes into a circle over it. */
function exitSample(t: number): TransitionSample {
  return {
    zoom: 1 - easeInOut(span(t, FADE_SWAP_AT, 1)),
    cityAway: 0,
    mix: 1,
    reveal: easeInOut(span(t, FADE_SWAP_AT, 0.75)),
    snapScale: 1 + (EXIT_SNAP_SCALE - 1) * easeInOut(span(t, FADE_SWAP_AT, 0.75)),
  };
}

/** Reduced motion and city <-> city: a plain cross-fade, no zoom, no scale. */
function fadeSample(t: number): TransitionSample {
  return { zoom: 0, cityAway: 0, mix: smooth(span(t, FADE_SWAP_AT, 1)), reveal: 0, snapScale: 1 };
}

export function sampleFor(mode: TransitionMode, t: number): TransitionSample {
  if (mode === 'enter') return enterSample(t);
  return mode === 'exit' ? exitSample(t) : fadeSample(t);
}

/** Progress at which the arriving stage takes the screen. */
export function swapAtFor(mode: TransitionMode): number {
  return mode === 'enter' ? ENTER_SWAP_AT : FADE_SWAP_AT;
}

export function secondsFor(mode: TransitionMode): number {
  if (mode === 'enter') return ENTER_SECONDS;
  return mode === 'exit' ? EXIT_SECONDS : FADE_SECONDS;
}
