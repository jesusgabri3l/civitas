/**
 * The crossing between two stages, as pure functions of one progress `t` (0..1).
 * `t = 0` is the globe, `t = 1` the city; going back to the globe is the same timeline played backwards (the engine
 * only flips the direction). A snapshot of the globe stays over the city, scaling around an anchor while a window opens.
 */
export type TransitionMode = 'enter' | 'fade';

export interface TransitionSample {
  /** 0..1 how deep the globe camera has dived (0 at rest, 1 at the closest point). */
  zoom: number;
  /** 0..1 how far a city is from rest while it settles in. */
  cityAway: number;
  /** 0..1 how visible the arriving stage is; the snapshot of the leaving one has `1 - mix`. */
  mix: number;
  /** 0..1 size of the rounded window that opens from the anchor over the snapshot (0 = none). */
  reveal: number;
  /** Scale of the snapshot around the anchor. */
  snapScale: number;
}

/** Tuned by eye: 0.35x of the first 1.2 s version (0.25x felt slow, 0.5x rushed). Going back takes the same. */
export const ENTER_SECONDS = 1.2 / 0.35;
export const FADE_SECONDS = 0.3;

const ENTER_SWAP_AT = 0.4;
const FADE_SWAP_AT = 0.02;

const ENTER_SNAP_SCALE = 1.5;

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

/** Reduced motion and city <-> city: a plain cross-fade, no zoom, no scale. */
function fadeSample(t: number): TransitionSample {
  return { zoom: 0, cityAway: 0, mix: smooth(span(t, FADE_SWAP_AT, 1)), reveal: 0, snapScale: 1 };
}

export function sampleFor(mode: TransitionMode, t: number): TransitionSample {
  return mode === 'enter' ? enterSample(t) : fadeSample(t);
}

/** Progress at which the arriving stage takes the screen. */
export function swapAtFor(mode: TransitionMode): number {
  return mode === 'enter' ? ENTER_SWAP_AT : FADE_SWAP_AT;
}

export function secondsFor(mode: TransitionMode): number {
  return mode === 'enter' ? ENTER_SECONDS : FADE_SECONDS;
}
