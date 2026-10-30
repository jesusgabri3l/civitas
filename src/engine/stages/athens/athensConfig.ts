import type { MonumentEnvironment } from '../shared/monument';
import type { CameraKey, CameraTrack } from '../shared/StoryCamera';
import type { ModelConfig } from './parthenonDimensions';

/**
 * Athens: the Parthenon as a plaster maquette (docs/ART-DIRECTION.md). Identity: night-blue ground, terracotta accent. Everything
 * the stage needs is here: the scene around the maquette, the model's measures and colors, the story states and the camera.
 */

/** Real proportions of the temple (stylobate 69.5 x 30.9 m, 8 x 17 columns of ~10.4 m). */
export const PARTHENON_MODEL: ModelConfig = {
  stylobateLength: 69.5,
  stylobateWidth: 30.9,
  columnsLong: 17,
  columnsShort: 8,
  columnHeight: 10.43,
  columnBaseDiameter: 1.905,
  columnTopRatio: 0.78,
  entasis: 0.05,
  fluteCount: 20,
  pedimentHeight: 3.45,
};

/** Same rubble and broken columns on every visit. */
export const SEED = 7;

const PEDESTAL_HEIGHT = 3;
/** Base of the temple (its lowest step): the top of the pedestal. */
export const BASE_Y = -0.6;

/** The scene around the maquette. Ground and accent: keep in sync with `$cities.athens` in _variables.scss. */
export const ATHENS_ENV: MonumentEnvironment = {
  backdrop: 0x0f1a2a,
  floorY: BASE_Y - PEDESTAL_HEIGHT,
  fog: { near: 170, far: 560 },
  floor: { color: 0x0b1420, roughness: 0.7 },
  pedestal: { width: 84, depth: 44, height: PEDESTAL_HEIGHT, color: 0x8a857c, bevel: 0.08 },
  spot: { position: [-50, 140, 60], target: [0, 2, 0], angle: 20, penumbra: 1, intensity: 2.7, color: 0xfff6ea, softness: 3, decay: 2, cookie: true },
  beam: { angle: 15, opacity: 0.07, color: 0xfff4e6 },
  fill: { sky: 0xe4e9f4, ground: 0x2a3a58, intensity: 0.55 },
  rim: { color: 0x9db4e8, intensity: 0.4, position: [70, 55, -130] },
  contact: { opacity: 0.4, width: 80, depth: 42 },
  dust: { color: 0xffd9a8, baseAlpha: 0.2, size: 0.9 },
  shadows: true,
  bias: -0.0003,
  normalBias: 0.05,
  look: { exposure: 1.05, aoStrength: 0.6, aoRadius: 2.4, grain: 0.03, warmth: 0.15, vignette: 0.28, filmic: 0.2, outline: 0.55, outlineWidth: 1, outlineColor: 0x1b1a17 },
  framingX: 0.24,
};

/** Plaster of the maquette and its three toon bands (shadow, mid, light: share of the lit color). */
export const PLASTER = {
  color: 0xf4efe6,
  bands: [0.42, 0.72, 1] as const,
} as const;

/** Instance tints (multiplied by the plaster): the recesses and the triglyphs. */
export const TINT = {
  plaster: 0xffffff,
  recess: 0xcfc6b4,
  triglyph: 0x9e9482,
  tympanum: 0xd6cdbb,
} as const;

/** The accent of Athens (terracotta): only what the story changes (broken tops, rubble, the marbles that leave). */
export const ACCENT = 0xc8673e;

/** Original paint, as reconstructed by research (to verify before publishing): blue triglyphs and tympana, red mouldings, gilding. */
export const PAINT = {
  triglyph: 0x3b5ea8,
  tympanum: 0x4a6fbf,
  moulding: 0xb8443a,
  sculpture: 0xd9a54a,
} as const;

/** Meters each layer of the temple rises in the exploded view. Drums rise `drum` per drum. */
export const EXPLODE_LIFT = {
  drum: 3,
  capital: 16,
  cella: 8,
  architrave: 20,
  frieze: 24,
  geison: 28,
  pediment: 34,
  roof: 40,
  /** The pieces also spread out from the center by this share. */
  spread: 0.1,
} as const;

/** Drums per column shaft (the exploded view and the building show them apart). */
export const DRUMS = 4;

/**
 * State of the maquette, each 0..1: `explode` pulls the layers apart, `paint` shows the original colors, `ruin` is the 1687 blast,
 * `elgin` takes the pediment sculptures away, `restore` puts back the columns raised by the restoration.
 */
export interface AthensState extends Record<string, number> {
  explode: number;
  paint: number;
  ruin: number;
  elgin: number;
  restore: number;
}

export const INTACT: AthensState = { explode: 0, paint: 0, ruin: 0, elgin: 0, restore: 0 };
/** State the shaders are compiled in: rubble, accent and paint all on screen. */
export const WARM_UP: AthensState = { explode: 0, paint: 0.5, ruin: 0.5, elgin: 0, restore: 0 };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const span = (t: number, from: number, to: number) => ease((t - from) / (to - from));

/**
 * The maquette for each chapter (0 prologue, 1 Pentelikon, 2 Pericles, 3 1687, 4 the marbles, 5 today, 6 explore) at progress `t`.
 * Every chapter starts in the state the previous one ends in, so scrolling is continuous both ways. The chapters themselves are in
 * src/data/stories/athens.ts (same order).
 */
export function stateFor(chapter: number, t: number): AthensState {
  switch (chapter) {
    case 0:
      return { ...INTACT };
    case 1:
      return { ...INTACT, explode: span(t, 0.1, 0.7) };
    case 2:
      return { ...INTACT, explode: 1 - span(t, 0.05, 0.5), paint: span(t, 0.55, 0.85) };
    case 3:
      return { ...INTACT, paint: 1 - span(t, 0, 0.25), ruin: span(t, 0.25, 0.8) };
    case 4:
      return { ...INTACT, ruin: 1, elgin: span(t, 0.15, 0.75) };
    case 5:
      return { ...INTACT, ruin: 1, elgin: 1, restore: span(t, 0.2, 0.8) };
    default:
      return { ...INTACT, ruin: 1, elgin: 1, restore: 1 };
  }
}

/** With reduced motion each chapter shows the state it ends in. */
export const finalStateFor = (chapter: number): AthensState => stateFor(chapter, 1);

/**
 * Explore (the last chapter): the drag turns the maquette within these limits (degrees) and the view buttons switch between these
 * states. View ids match the buttons of the chapter in src/data/stories/athens.ts; the first one is the chapter's own state.
 */
export const EXPLORE = {
  chapter: 6,
  orbit: { yaw: 40, pitchUp: 14, pitchDown: 6 },
  views: {
    today: { ...INTACT, ruin: 1, elgin: 1, restore: 1 },
    built: { ...INTACT },
    painted: { ...INTACT, paint: 1 },
    exploded: { ...INTACT, explode: 1 },
  } satisfies Record<string, AthensState>,
};

/** One shot per chapter (same order as `stateFor`). The temple stays on the right of the frame (text on the left). */
const KEYS: readonly CameraKey[] = [
  { position: [-76, 28, 86], target: [0, 5, 0], fov: 36 },
  { position: [-92, 44, 104], target: [0, 16, 0], fov: 40 },
  { position: [82, 26, 82], target: [0, 9, 0], fov: 38 },
  { position: [-52, 40, 122], target: [4, 6, 0], fov: 36 },
  { position: [112, 30, 54], target: [14, 9, 0], fov: 34 },
  { position: [-60, 34, -74], target: [0, 8, 0], fov: 38 },
  { position: [-74, 24, 70], target: [0, 9, 0], fov: 40 },
];

/** Share at the end of each chapter where the camera is already in its pose (it travels there while the text comes in). */
const HOLD = [0, 0.3, 0.3, 0.3, 0.3, 0.3, 0.25] as const;

export const ATHENS_TRACK: CameraTrack = { keys: KEYS, hold: HOLD };
