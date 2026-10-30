/**
 * The crossing between two stages, as pure functions of one progress `t` (0..1) from the leaving stage to the arriving one.
 * Turning back mid-way plays the same timeline backwards (the engine only flips the direction).
 *
 * Leaving a city: the globe is live at once, coming out of the dive decelerating, and a snapshot of the city closes over it
 * in a circle that shrinks into the city, pulling away accelerating, with no blur.
 * Entering is that, mirrored in time: the globe dives (zoom accelerating, no braking) and, at the swap, its snapshot keeps
 * zooming along the very same dive curve (so position and speed carry on with no jump) while a circle with the same curve
 * opens from the city's point on the globe (fixed at the swap) and the city camera eases in to rest.
 */
export type TransitionMode = 'enter' | 'exit' | 'fade';

export interface TransitionSample {
  /** 0..1 how deep the globe camera has dived (0 at rest, 1 at the closest point). */
  zoom: number;
  /** 0..1 how far a city is from rest while it settles in. */
  cityAway: number;
  /** 0..1 how visible the arriving stage is (the plain fade dissolves the snapshot with `1 - mix`). */
  mix: number;
  /** 0..1 how far the circle around the anchor has gone: opened in the snapshot, or closed over it when leaving (0 = none). */
  reveal: number;
  /** Scale of the snapshot around the anchor. */
  snapScale: number;
  /** 0..1 radial speed blur of the snapshot toward the anchor. */
  blur: number;
}

/** Whole trip lengths. Tuned by eye. */
export const ENTER_SECONDS = 2.0;
export const EXIT_SECONDS = 2.0;
export const FADE_SECONDS = 0.3;

/** Progress at which the city takes the screen. The globe is still diving; its snapshot carries on from here. */
const ENTER_SWAP_AT = 0.7;
/** Leaving and fading swap on the second frame: the first one only captures the stage that leaves. */
const FADE_SWAP_AT = 0.02;
/** Entering: the dive (zoom 0 -> 1) lasts until this progress, accelerating with this power (1 = linear). */
const ENTER_DIVE_END = 0.92;
const ENTER_DIVE_POWER = 1.3;
/** Entering: progress at which the circle has covered the screen. */
const ENTER_REVEAL_END = 0.98;
/**
 * Camera depth above the city at the deepest dive over the depth at rest (about 0.15 / 2.1 globe radii: see DIVE_DISTANCE in
 * globeStage). The snapshot scales by the ratio of depths, as the live globe would.
 */
const DIVE_DEPTH_RATIO = 0.07;
/** Leaving: progress at which the circle has closed. */
const EXIT_REVEAL_END = 0.8;
/** Leaving: the city snapshot pulls away down to this as the circle closes. */
const EXIT_SNAP_SCALE = 0.8;
/** Share of the circle's run during which the speed blur lives (it is gone before the circle ends). */
const BLUR_SHARE = 0.6;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const span = (t: number, from: number, to: number) => clamp01((t - from) / (to - from));
const smooth = (x: number) => x * x * (3 - 2 * x);
const easeIn = (x: number) => x * x * x;
const easeOut = (x: number) => 1 - (1 - x) * (1 - x) * (1 - x);
/** Strong ease-in-out (cubic): slow start, fast middle, slow end. */
const easeInOutStrong = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

/** Globe dive at `t`, as if it kept going after the swap. */
const diveAt = (t: number) => span(t, 0, ENTER_DIVE_END) ** ENTER_DIVE_POWER;
const depthAt = (dive: number) => 1 - dive * (1 - DIVE_DEPTH_RATIO);

/** Globe -> city: the globe dives, swaps while still diving, its snapshot carries on while a circle opens from the city. */
function enterSample(t: number): TransitionSample {
  const open = span(t, ENTER_SWAP_AT, ENTER_REVEAL_END);
  const swapDive = diveAt(ENTER_SWAP_AT);
  const dive = diveAt(t);
  return {
    zoom: dive,
    cityAway: 1 - easeOut(open),
    mix: 1,
    reveal: easeInOutStrong(open),
    // The live globe's own zoom, continued: same position and speed at the swap.
    snapScale: depthAt(swapDive) / depthAt(Math.max(dive, swapDive)),
    // Zero at the swap and at the end, strongest while the circle is large.
    blur: Math.sin(Math.PI * span(1 - open, 0, BLUR_SHARE)),
  };
}

/** City -> globe: the globe leaves the dive slowing down while the city snapshot closes into a circle, pulling away. */
function exitSample(t: number): TransitionSample {
  const close = span(t, FADE_SWAP_AT, EXIT_REVEAL_END);
  return {
    zoom: 1 - easeOut(span(t, FADE_SWAP_AT, 1)),
    cityAway: 0,
    mix: 1,
    reveal: easeInOutStrong(close),
    snapScale: 1 + (EXIT_SNAP_SCALE - 1) * easeIn(close),
    blur: 0,
  };
}

/** Reduced motion and city <-> city: a plain cross-fade, no zoom, no scale. */
function fadeSample(t: number): TransitionSample {
  return { zoom: 0, cityAway: 0, mix: smooth(span(t, FADE_SWAP_AT, 1)), reveal: 0, snapScale: 1, blur: 0 };
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
