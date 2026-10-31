import { colorNumber } from '../../theme';
import { meta } from '../meta';
import type { MonumentEnvironment } from '../../../engine/stages/shared/monument';
import type { CameraKey, CameraTrack } from '../../../engine/stages/shared/StoryCamera';

/**
 * Paris: the Eiffel Tower as a plaster maquette by night (docs/ART-DIRECTION.md). Identity: violet night, champagne accent, the tower
 * itself is the light (amber bulbs). Everything the stage needs is here: the scene, the measures and colors of the model, the story
 * states and the camera. Measures in meters: TODO verify every figure with sources (SETE / Eiffel Tower official documentation).
 */

/** Real proportions of the tower (125 m square base, levels at 57.6 / 115.7 / 276.1 m, 300 m of iron, 330 m with the antenna). */
export const EIFFEL_MODEL = {
  /** Half width of the outer corner of a pier at the ground. */
  baseHalf: 62.45,
  /** Half width of one pier at the ground (the pier is ~26 m wide). */
  pierHalf: 13,
  firstLevel: 57.6,
  secondLevel: 115.7,
  thirdLevel: 276.1,
  /** Top of the iron structure (1889 height, without flag or antenna). */
  summit: 300,
  /** Top of today's antenna. */
  mastTop: 330,
  /** The great arches between the piers: clear half span and crown height. */
  arch: { halfSpan: 38, height: 39, planeOffset: 40 },
  /** The outline of the tower: half width of the outer posts at height `h`, an exponential taper fitted to the real silhouette. */
  profile: { floor: 2.8, amplitude: 59.65, scale: 76.9 },
} as const;

/** Half width of the outer posts at height `h`. */
export const halfWidthAt = (h: number) => EIFFEL_MODEL.profile.floor + EIFFEL_MODEL.profile.amplitude * Math.exp(-h / EIFFEL_MODEL.profile.scale);

/** Half width of a pier at height `h`: it narrows until the four piers merge at the second level. */
export const pierHalfAt = (h: number) => EIFFEL_MODEL.pierHalf * Math.max(0, 1 - h / EIFFEL_MODEL.secondLevel);

/** IANA time zone of the hourly sparkle (docs/ART-DIRECTION.md §4). */
export const TIME_ZONE = 'Europe/Paris';
/** The tower sparkles the first minutes of every hour (the real one: 5 minutes). */
export const SPARKLE_MINUTES = 5;

/** Same pieces on every visit (star field). */
export const SEED = 11;

const PEDESTAL_HEIGHT = 4;
/** Base of the tower: the top of the pedestal. */
export const BASE_Y = 0;

/** The scene around the maquette. Ground and accent: the colors come from `meta.theme`. */
export const PARIS_ENV: MonumentEnvironment = {
  backdrop: colorNumber(meta.theme.ground),
  floorY: BASE_Y - PEDESTAL_HEIGHT,
  fog: { near: 650, far: 1350 },
  floor: { color: 0x0d0c19, roughness: 0.7 },
  pedestal: { width: 150, depth: 150, height: PEDESTAL_HEIGHT, color: 0x85808a, bevel: 0.2 },
  spot: { position: [-170, 560, 260], target: [0, 150, 0], angle: 20, penumbra: 0.9, intensity: 2.7, color: 0xf4eeff, softness: 3, decay: 2, cookie: true },
  beam: { angle: 13, opacity: 0.04, color: 0xe6e0ff },
  fill: { sky: 0xcfc8f2, ground: 0x1d1a3a, intensity: 0.5 },
  rim: { color: 0x9a90e0, intensity: 0.35, position: [260, 220, -520] },
  contact: { opacity: 0.4, width: 140, depth: 140 },
  // The air of Paris at night carries no dust in the beam: the stars and the tower's own lights are the atmosphere.
  dust: null,
  shadows: true,
  shadowFar: 900,
  bias: -0.0003,
  normalBias: 0.15,
  look: { exposure: 1.05, aoStrength: 0.6, aoRadius: 8, grain: 0.03, warmth: 0.1, vignette: 0.3, filmic: 0.2, outline: 0.55, outlineWidth: 1, outlineColor: 0x1b1a17 },
  framingX: 0.24,
};

/** Plaster of the maquette and its three toon bands (shadow, mid, light: share of the lit color). */
export const PLASTER = {
  color: 0xf4efe6,
  bands: [0.42, 0.72, 1] as const,
} as const;

/** Instance tints (multiplied by the plaster): diagonals and platforms sit a shade apart from the posts. */
export const TINT = {
  plaster: 0xffffff,
  brace: 0xdcd4c4,
  platform: 0xcfc6b4,
} as const;

/** The accent of Paris (champagne): only what the story changes (the antenna) and the part under the finger. */
export const ACCENT = colorNumber(meta.theme.accent);

/** The lights of the tower (amber), the flash of the sparkle and the warmth they leave on the iron. */
export const LIGHTS = {
  glow: 0xffa64a,
  steady: 0xffb858,
  flash: 0xffffff,
  /** Share of the amber that lights give to the plaster of the tower around them. */
  warmth: 0.16,
  /** Flashes per second of the sparkle. */
  rate: 12,
  /** Share of the bulbs that flash in each beat. */
  share: 0.4,
  /** How much the steady bulbs dim while the others flash (more contrast reads as more brightness). */
  dim: 0.65,
  /** Opacity of the glow at the foot: steady, and at full sparkle. */
  glowOpacity: 0.5,
  sparkleGlow: 0.95,
} as const;

/** Meters each layer of the tower rises in the exploded view. */
export const EXPLODE_LIFT = {
  pier: 0,
  first: 26,
  legs: 52,
  second: 80,
  shaft: 112,
  third: 150,
  mast: 190,
  /** The pieces also spread out from the center by this share. */
  spread: 0.06,
} as const;

/**
 * State of the maquette, each 0..1: `explode` pulls the levels apart, `lights` turns the bulbs on, `sparkle` makes them flash (the
 * hourly show, on demand), `mast` raises the antenna of 1909.
 */
export interface ParisState extends Record<string, number> {
  explode: number;
  lights: number;
  sparkle: number;
  mast: number;
  /** Plaster built from the ground up (1 = whole tower, 0 = none). */
  build: number;
  /** The drawing of 1884: share of its lines drawn, from the ground up. */
  draw: number;
  /** The sheet of paper behind the drawing (0 rolled up, 1 open). */
  paper: number;
  /** Depth of the drawing: 0 a flat elevation on the paper, 1 the tower in three dimensions (it becomes the iron). */
  depth: number;
}

export const REST: ParisState = { explode: 0, lights: 1, sparkle: 0, mast: 0, build: 1, draw: 0, paper: 0, depth: 1 };
/** The hero (prologue): the tower of today, antenna up and sparkling. */
export const HERO: ParisState = { ...REST, mast: 1, sparkle: 1 };
/** State the shaders are compiled in: every kind of piece and color on screen. */
export const WARM_UP: ParisState = { explode: 0.5, lights: 1, sparkle: 1, mast: 1, build: 1, draw: 0.5, paper: 0.5, depth: 0.5 };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const span = (t: number, from: number, to: number) => ease((t - from) / (to - from));

/**
 * The maquette for each chapter (0 prologue, 1 the sketch, 2 construction, 3 the fair of 1889, 4 radio, 5 today, 6 explore) at
 * progress `t`. Every chapter starts in the state the previous one ends in, so scrolling is continuous both ways. The chapters
 * themselves are in src/cities/paris/story.ts (same order).
 */
export function stateFor(chapter: number, t: number): ParisState {
  switch (chapter) {
    case 0:
      return { ...HERO };
    case 1:
      // Back to the sketch: the sparkle stops and the antenna of 1909 comes down before the tower does.
      return {
        ...REST,
        sparkle: 1 - span(t, 0, 0.15),
        mast: 1 - span(t, 0, 0.3),
        lights: 1 - span(t, 0, 0.35),
        // The tower comes down from the top, the sheet unrolls and the elevation of 1884 is drawn on it from the ground up.
        build: 1 - span(t, 0.05, 0.45),
        paper: span(t, 0.2, 0.5),
        depth: 0,
        draw: span(t, 0.35, 0.85),
      };
    case 2:
      // The drawing comes off the paper: the sheet rolls away, the lines take depth, the iron rises over them from the ground up.
      return {
        ...REST,
        lights: 0,
        draw: 1 - span(t, 0.85, 0.98),
        paper: 1 - span(t, 0, 0.3),
        depth: span(t, 0, 0.4),
        build: span(t, 0.4, 0.9),
      };
    case 3:
      return { ...REST, lights: span(t, 0.15, 0.7) };
    case 4:
      return { ...REST, mast: span(t, 0.15, 0.75) };
    case 5:
      return { ...REST, mast: 1, sparkle: span(t, 0.2, 0.5) };
    default:
      return { ...REST, mast: 1 };
  }
}

/** With reduced motion each chapter shows the state it ends in. */
export const finalStateFor = (chapter: number): ParisState => stateFor(chapter, 1);

/**
 * Explore (the last chapter): the drag turns the maquette within these limits (degrees) and the view buttons switch between these
 * states. View ids match the buttons of the chapter in src/cities/paris/story.ts; the first one is the chapter's own state.
 */
export const EXPLORE = {
  chapter: 6,
  orbit: { yaw: 40, pitchUp: 14, pitchDown: 4 },
  views: {
    today: { ...REST, mast: 1 },
    built: { ...REST },
    sparkle: { ...REST, mast: 1, sparkle: 1 },
    exploded: { ...REST, mast: 1, lights: 0, explode: 1 },
  } satisfies Record<string, ParisState>,
};

/** One shot per chapter (same order as `stateFor`). The tower stays on the right of the frame (text on the left). */
const KEYS: readonly CameraKey[] = [
  { position: [-380, 170, 560], target: [0, 150, 0], fov: 38 },
  { position: [-520, 260, 700], target: [0, 210, 0], fov: 40 },
  { position: [440, 120, 480], target: [0, 120, 0], fov: 40 },
  { position: [-330, 40, 470], target: [0, 140, 0], fov: 42 },
  { position: [260, 260, 330], target: [0, 270, 0], fov: 36 },
  { position: [-340, 120, -520], target: [0, 150, 0], fov: 38 },
  { position: [-420, 190, 540], target: [0, 150, 0], fov: 40 },
];

/** Share at the end of each chapter where the camera is already in its pose (it travels there while the text comes in). */
const HOLD = [0, 0.3, 0.3, 0.3, 0.3, 0.3, 0.25] as const;

export const PARIS_TRACK: CameraTrack = { keys: KEYS, hold: HOLD };

/**
 * The drawing of 1884 (chapters 1-2): the elevation of the tower in ink on a sheet of paper that faces the camera of the sketch
 * chapter. When the sheet rolls away the lines take depth and turn champagne, and the iron rises over them.
 */
export const DRAWING = {
  /** The sheet faces this point (the camera of chapter 1), seen from above. */
  facing: KEYS[1].position,
  paper: 0xefe6d2,
  grid: 0xe0d5bd,
  ink: 0x2b2a35,
  /** Sheet size (m) and how far behind the drawing it sits. */
  width: 190,
  height: 340,
  offset: 4,
} as const;
