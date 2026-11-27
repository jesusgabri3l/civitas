import { colorNumber } from '../../theme';
import { meta } from '../meta';
import type { MonumentEnvironment } from '../../../engine/stages/shared/monument';
import type { CameraKey, CameraTrack } from '../../../engine/stages/shared/StoryCamera';

/**
 * Giza: the Great Pyramid as a plaster maquette at dawn (docs/ART-DIRECTION.md, docs/briefs/giza.md). Identity: desert-night ocre
 * ground, Egyptian blue. Everything the stage needs is here.
 *
 * Model axes: x = east, -z = north, `y = 0` is the base, on top of the pedestal. The model is built in real meters and its root is
 * scaled by `SCALE`; the environment and the camera are in scene units (meters x `SCALE`).
 */

/** Scene units per real meter: the pyramid (146.6 m) is about 42 units tall, as tall as the other maquettes. */
export const SCALE = 0.29;
const scene = (meters: number) => meters * SCALE;

/** Real measures in meters (docs/briefs/giza.md §4). */
export const PYRAMID = {
  halfBase: 115.15,
  height: 146.6,
  /** Height today, with the tip lost. */
  todayHeight: 138.5,
  /** The ~203 courses of today, grouped in this many bands. */
  bands: 50,
  /** Thickness of the casing: the core stands this far inside the line of the slope. */
  casing: 1.2,
  /** Angle of the faces: 51 deg 50' 40". */
  slope: (51 + 50 / 60 + 40 / 3600) * (Math.PI / 180),
} as const;

export const BAND_HEIGHT = PYRAMID.height / PYRAMID.bands;
/** Bands that survive today: the rest is the lost tip. */
export const BANDS_TODAY = Math.floor(PYRAMID.todayHeight / BAND_HEIGHT);

/** Half width of the casing at height `y`. */
export const casingHalfWidth = (y: number) => PYRAMID.halfBase * (1 - y / PYRAMID.height);
/** Half width of the core in band `band` (its top, minus the casing). */
export const coreHalfWidth = (band: number) => casingHalfWidth((band + 1) * BAND_HEIGHT) - PYRAMID.casing;

/** North-south cut through the corridors, which run a little east of the axis. `depth`: how far the half that stays ends before the plane, so the passages are niches with a back. */
export const CUT = { x: 7.3, depth: 3 } as const;

/**
 * The inside, in the plane of the cut (z south, y up). Lengths along the slope are given as horizontal run. The real figures are in
 * the brief §4 (Maragioglio and Rinaldi 1965, Dormion 2004, Edwards 1986); the plane is a simplification: the chambers are drawn as
 * if the plane crossed them through the middle. The underground chamber is only in the text.
 */
export const INTERIOR = {
  /** Vertical thickness of the narrow passages (1.2 m of clear height at 26 degrees). */
  passage: 1.35,
  descent: { slope: 0.498, entryZ: -102.9, entryY: 15.6, startZ: -108, endY: 1 },
  ascent: { slope: 0.492, junctionZ: -77.7, run: 35.2 },
  /** 46.68 m long, 8.6 m high (perpendicular), same slope as the ascent. */
  gallery: { run: 41.9, thickness: 9.6 },
  queen: { passageRun: 38.7, width: 5.8, wall: 4.7, ridge: 6.3 },
  antechamber: { length: 2.8, height: 3.8, step: 1.2 },
  king: { width: 5.2, height: 5.8, length: 10.5 },
  /** The five relieving chambers over the king's chamber: first gap over the roof, height of each, slab between them, extra width. */
  relief: { gap: 1.5, height: 1.2, slab: 0.9, widen: 0.3, ridge: 2.3 },
  /** The Big Void (2017) over the gallery: distance over its ceiling, length along z, thickness. */
  voidSpace: { above: 5, from: -30, to: 0.5, thickness: 8 },
  /** The corridor behind the north face (2023). */
  northCorridor: { z: [-96, -87], y: [17.9, 19.9] },
} as const;

/** Same stone on every visit. */
export const SEED = 1903;

const PEDESTAL_HEIGHT = 3.5;
/** Base of the maquette: the top of the pedestal. */
export const BASE_Y = 0;

/** The scene around the maquette. Ground and accent: the colors come from `meta.theme`. */
export const GIZA_ENV: MonumentEnvironment = {
  backdrop: colorNumber(meta.theme.ground),
  floorY: BASE_Y - PEDESTAL_HEIGHT,
  fog: { near: 330, far: 900 },
  floor: { color: 0x1c1409, roughness: 0.7 },
  pedestal: { width: scene(2 * PYRAMID.halfBase) + 17, depth: scene(2 * PYRAMID.halfBase) + 17, height: PEDESTAL_HEIGHT, color: 0x8a847a, bevel: 0.2 },
  // Dawn from the east, low and warm: it rakes the courses of the east face and leaves the north one in a long shadow.
  spot: { position: [290, 100, 70], target: [0, 12, 0], angle: 15, penumbra: 0.85, intensity: 3, color: 0xffd9a8, softness: 3, decay: 2, cookie: false },
  beam: { angle: 11, opacity: 0.05, color: 0xffd9a8 },
  fill: { sky: 0xe6dcc8, ground: 0x241a0c, intensity: 0.4 },
  // A faint cool counter-light from the west.
  rim: { color: 0x9db8e8, intensity: 0.35, position: [-250, 60, 40] },
  contact: { opacity: 0.4, width: scene(2 * PYRAMID.halfBase) + 6, depth: scene(2 * PYRAMID.halfBase) + 6 },
  dust: { color: 0xffd9a8, baseAlpha: 0.12, size: 0.8 },
  shadows: true,
  shadowFar: 400,
  bias: -0.0004,
  normalBias: 0.2,
  look: { exposure: 1.05, aoStrength: 0.6, aoRadius: 3, grain: 0.015, warmth: 0.06, vignette: 0.3, filmic: 0.2, outline: 0.55, outlineWidth: 1, outlineColor: 0x1b1a17 },
  framingX: 0.24,
};

/** Toon bands (shadow, mid, light: share of the lit color) of the plaster of the core and the interior. */
export const PLASTER = { color: 0xf4efe6, bands: [0.42, 0.72, 1] as const } as const;
/** The casing is the same plaster, a shade lighter and with a wider light band: under the raking light its smooth faces shine a little more. No color. */
export const CASING_PLASTER = { color: 0xfbf7ee, bands: [0.55, 0.85, 1] as const } as const;

/** Instance tints (multiplied by the plaster). */
export const COLORS = {
  plaster: 0xffffff,
  stoneDark: 0xcfc9bb,
  stoneMid: 0xdcd6c8,
  accent: colorNumber(meta.theme.accent),
  sand: 0xd9c49a,
} as const;

/** Sheet of sand haze at the foot of the pyramid (real meters): `size` along x and z. */
export const SAND = { y: 3, size: [340, 340] as const, opacity: 0.22 } as const;

/**
 * State of the maquette, each 0..1. `plateau`: the square of the base and the four cardinal marks. `quarries`: the three heaps of
 * blocks arrive one after the other (plateau limestone, Aswan granite, Tura limestone). `courses`: the core rises band by band.
 * `casing`: the smooth skin covers the core from the bottom up. `strip`: the casing falls from the top and the tip is lost. `tunnel`:
 * the robbers' tunnel on the north face. `section`: the east half is withdrawn and the cut shows the inside. `void`: the Big Void
 * and the north corridor as dashed outlines.
 */
export interface GizaState extends Record<string, number> {
  plateau: number;
  quarries: number;
  courses: number;
  casing: number;
  strip: number;
  tunnel: number;
  section: number;
  void: number;
}

/** Today: the stepped core, no tip, the tunnel open, a few casing stones at the foot. */
export const REST: GizaState = { plateau: 0, quarries: 0, courses: 1, casing: 1, strip: 1, tunnel: 1, section: 0, void: 0 };
/** State the shaders are compiled in: every kind of piece, color and the open cut on screen. */
export const WARM_UP: GizaState = { plateau: 0.5, quarries: 0.5, courses: 0.5, casing: 0.5, strip: 0.5, tunnel: 1, section: 0.5, void: 0.5 };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const span = (t: number, from: number, to: number) => ease((t - from) / (to - from));

const NONE = { plateau: 0, quarries: 0, courses: 0, casing: 0, strip: 0, tunnel: 0, section: 0, void: 0 } satisfies GizaState;

/**
 * The maquette for each chapter (0 prologue, 1 plateau, 2 courses, 3 casing, 4 stripped, 5 today, 6 explore) at progress `t`. Every
 * chapter starts in the state the previous one ends in, so scrolling is continuous both ways. The chapters themselves are in
 * src/cities/giza/story.ts (same order).
 */
export function stateFor(chapter: number, t: number): GizaState {
  const today = { courses: 1, casing: 1, strip: 1, tunnel: 1 };
  switch (chapter) {
    case 0:
      return { ...REST };
    case 1:
      // Back to the plateau: the pyramid goes, the square is traced and the heaps of stone arrive.
      return { ...NONE, plateau: span(t, 0.05, 0.4), quarries: span(t, 0.35, 0.9) };
    case 2:
      return { ...NONE, plateau: 1 - span(t, 0, 0.12), quarries: 1 - span(t, 0, 0.12), courses: span(t, 0.08, 0.92) };
    case 3:
      return { ...NONE, courses: 1, casing: span(t, 0.08, 0.85) };
    case 4:
      return { ...NONE, courses: 1, casing: 1, tunnel: span(t, 0.05, 0.3), strip: span(t, 0.3, 0.85) };
    case 5:
      // Progress ends when the text is read: the cut and the void stay through it.
      return { ...today, plateau: 0, quarries: 0, section: span(t, 0.05, 0.6), void: span(t, 0.5, 0.85) };
    case 6:
      return { ...today, plateau: 0, quarries: 0, section: 1 - span(t, 0, 0.35), void: 1 - span(t, 0, 0.2) };
    default:
      return { ...REST };
  }
}

/** With reduced motion each chapter shows the state it ends in. */
export const finalStateFor = (chapter: number): GizaState => stateFor(chapter, 1);

/** The views of Explore (ids of the buttons in story.ts). The first one is the chapter's own state. */
export const VIEWS = {
  today: { ...REST },
  cased: { ...NONE, courses: 1, casing: 1 },
  inside: { ...REST, section: 1, void: 1 },
} satisfies Record<string, GizaState>;

/** Explore (the last chapter): the pyramid is symmetric, so the drag turns it all the way round. */
export const EXPLORE = {
  chapter: 6,
  orbit: { yaw: Infinity, pitchUp: 14, pitchDown: 4 },
  views: VIEWS,
  // Close shots for the two small parts of the north face (scene units = m × SCALE). TUNE BY EYE.
  focus: {
    entrance: { position: [10, 10, -54], target: [2.1, 4.9, -30.2], fov: 52 },
    tunnel: { position: [5, 7, -55], target: [-2.5, 2.4, -31.3], fov: 52 },
  } satisfies Record<string, CameraKey>,
};

/**
 * One shot per chapter (same order as `stateFor`), in scene units. The pyramid is compact (about 1.6:1) and has no dominant side.
 * It goes on the right of the screen (text on the left). Chapters 3 and 5 are the ones to check at 1366x768 so the tip does not
 * pass under the text. TUNE BY EYE with `npm run dev` (1440x900, 1366x768, 390x844).
 */
const KEYS: readonly CameraKey[] = [
  // Prologue: low 3/4 from the north-east, the corner toward the visitor, the east face raked by the dawn and the north one in shadow.
  { position: [88, 13, -88], target: [0, 17, 0], fov: 38 },
  // Plateau: high, almost overhead, the whole square.
  { position: [34, 128, 34], target: [0, 2, 0], fov: 38 },
  // Courses: raised 3/4 and close, looking at the top of the trunk.
  { position: [80, 58, 75], target: [0, 16, 0], fov: 40 },
  // Casing: low, raking along the east face, looking up at the tip.
  { position: [125, 9, -20], target: [0, 28, 0], fov: 38 },
  // Stripped: 3/4 from the north at half height: the entrance, the tunnel and the fall down the face.
  { position: [48, 24, -122], target: [0, 14, 0], fov: 40 },
  // Today: from the east, almost square to the plane of the cut, a little raised.
  { position: [118, 30, 8], target: [0, 21, 0], fov: 38 },
  // Explore.
  { position: [95, 30, -95], target: [0, 16, 0], fov: 40 },
];

/** Share at the end of each chapter where the camera is already in its pose (it travels there while the text comes in). */
const HOLD = [0, 0.3, 0.3, 0.3, 0.3, 0.3, 0.25] as const;

export const GIZA_TRACK: CameraTrack = { keys: KEYS, hold: HOLD };
