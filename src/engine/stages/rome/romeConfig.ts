import type { MonumentEnvironment } from '../shared/monument';
import type { CameraKey, CameraTrack } from '../shared/StoryCamera';

/**
 * Rome: the Colosseum as a plaster maquette at cold dawn (docs/ART-DIRECTION.md). Identity: slate ground, pompeian red accent, mist at
 * ground level. Everything the stage needs is here: the scene, the measures and colors of the model, the story states and the camera.
 * Measures in meters: TODO verify every figure with sources (Parco archeologico del Colosseo, Rea & Beste on the construction).
 */

/** Real proportions: ellipse of 189 x 156 m, 48 m high, 80 arches per ring, three arcades under an attic. */
export const COLOSSEUM_MODEL = {
  /** Semi-axes of the outer face of the facade. */
  outer: { a: 94.5, b: 78 },
  /** Thickness of the facade wall. */
  wall: 4,
  /** Semi-axes of the arena (87 x 55 m). */
  arena: { a: 43.5, b: 27.5 },
  /** Height of the three arcades and of the attic (48.5 m in all). */
  levels: [10.5, 11.8, 11.8] as const,
  attic: 14.4,
  bays: 80,
  /** Bays of the second (inner) ring, the one that stands out when the facade falls. */
  innerBays: 70,
  /** Where the inner ring stands between the arena (0) and the facade (1). */
  innerShare: 0.86,
  /** Seating rings: share of the way from the arena to the facade where each ends, and its height. */
  cavea: { cuts: [0, 0.22, 0.44, 0.62, 0.76, 0.86] as const, heights: [5, 9, 14, 21, 29] as const },
  /** Arch opening: width and share of the level it rises to. */
  opening: { width: 3.8, heightShare: 0.7 },
  hypogeumHeight: 3.2,
  floorThickness: 0.6,
  /** Awning (velarium): height of its outer edge, how far its inner edge drops and the share of the radius it keeps open. */
  velarium: { top: 53.5, drop: 13, openShare: 0.38 },
  mastHeight: 5.5,
} as const;

export const LEVEL_BASE = [0, 10.5, 22.3] as const;
export const ATTIC_BASE = 34.1;

/** Same debris on every visit. */
export const SEED = 80;

const PEDESTAL_HEIGHT = 4;
/** Base of the maquette: the top of the pedestal. */
export const BASE_Y = 0;

/** The scene around the maquette. Ground and accent: keep in sync with `$cities.rome` in _variables.scss. */
export const ROME_ENV: MonumentEnvironment = {
  backdrop: 0x141a22,
  floorY: BASE_Y - PEDESTAL_HEIGHT,
  fog: { near: 420, far: 1000 },
  floor: { color: 0x10151c, roughness: 0.7 },
  pedestal: { width: 240, depth: 220, height: PEDESTAL_HEIGHT, color: 0x88847c, bevel: 0.2 },
  // A colder spot than the other cities: the light of a winter dawn.
  spot: { position: [-130, 340, 190], target: [0, 15, 0], angle: 20, penumbra: 0.9, intensity: 2.7, color: 0xe8f0ff, softness: 3, decay: 2, cookie: true },
  beam: { angle: 12, opacity: 0.04, color: 0xdce8ff },
  fill: { sky: 0xcdd9ee, ground: 0x1a2330, intensity: 0.5 },
  rim: { color: 0x8fb0e0, intensity: 0.4, position: [220, 150, -340] },
  contact: { opacity: 0.4, width: 215, depth: 190 },
  // The air is mist near the ground (`MIST`), not dust in the beam.
  dust: null,
  shadows: true,
  shadowFar: 760,
  bias: -0.0003,
  normalBias: 0.15,
  look: { exposure: 1.05, aoStrength: 0.6, aoRadius: 6, grain: 0.03, warmth: 0.05, vignette: 0.3, filmic: 0.2, outline: 0.55, outlineWidth: 1, outlineColor: 0x1b1a17 },
  framingX: 0.24,
};

/** Plaster of the maquette and its three toon bands (shadow, mid, light: share of the lit color). */
export const PLASTER = {
  color: 0xf4efe6,
  bands: [0.42, 0.72, 1] as const,
} as const;

/** Instance tints (multiplied by the plaster): each part of the building sits a shade apart. */
export const TINT = {
  plaster: 0xffffff,
  inner: 0xdcd4c4,
  cavea: 0xcfc6b4,
  arena: 0xc4b9a2,
  awning: 0xece4d4,
} as const;

/** The accent of Rome (pompeian red): only what the story changes (the broken edge, fallen blocks, buttresses) and the part under the finger. */
export const ACCENT = 0xdb5f45;

/** Mist at ground level: two soft sheets of cold light. */
export const MIST = {
  color: 0xaec0d6,
  low: { y: 0.8, size: 560, opacity: 0.26 },
  high: { y: 7, size: 440, opacity: 0.12 },
} as const;

/** Layers of the maquette: each one moves, rises and falls by itself. */
export type Layer = 'hypogeum' | 'arena' | 'cavea0' | 'cavea1' | 'cavea2' | 'cavea3' | 'cavea4' | 'inner' | 'l1' | 'l2' | 'l3' | 'attic' | 'ground';

/** Meters each layer rises in the exploded view. */
export const EXPLODE_LIFT: Record<Layer, number> = {
  hypogeum: 0,
  arena: 14,
  cavea0: 10,
  cavea1: 20,
  cavea2: 30,
  cavea3: 40,
  cavea4: 50,
  inner: 20,
  l1: 6,
  l2: 30,
  l3: 54,
  attic: 78,
  ground: 0,
};
/** The pieces also spread out from the center by this share. */
export const EXPLODE_SPREAD = 0.05;

/** Share of `build` (0..1) in which each layer rises, one after another: arena and seating, inner ring, three arcades, attic. */
export const BUILD_SPAN: Record<Layer, readonly [number, number]> = {
  hypogeum: [0, 0.12],
  arena: [0.05, 0.15],
  cavea0: [0.06, 0.2],
  cavea1: [0.1, 0.24],
  cavea2: [0.14, 0.28],
  cavea3: [0.18, 0.32],
  cavea4: [0.22, 0.36],
  inner: [0.3, 0.42],
  l1: [0.4, 0.56],
  l2: [0.54, 0.7],
  l3: [0.68, 0.84],
  attic: [0.82, 0.98],
  ground: [-1, 0],
};

/**
 * How far the 1349 fall reaches on each level, as the angle (radians) from the south on each side. The upper levels fall further:
 * the surviving wall is the north one, and it is highest at its middle.
 */
export const RUIN_REACH = { l1: 0.95, l2: 1.05, l3: 1.15, attic: 1.3 } as const;

/**
 * State of the maquette, each 0..1: `explode` pulls the layers apart, `build` raises them one after another, `velarium` unfurls the
 * awning, `ruin` brings down the south side of the facade, `restore` marks the buttresses of 1807 and 1827, `floor` lays the arena.
 */
export interface ColosseumState extends Record<string, number> {
  explode: number;
  build: number;
  velarium: number;
  ruin: number;
  restore: number;
  floor: number;
}

/** The hero (prologue): the ruin of today, arena open to the hypogeum. */
export const REST: ColosseumState = { explode: 0, build: 1, velarium: 0, ruin: 1, restore: 0, floor: 0 };
/** State the shaders are compiled in: every kind of piece and color on screen. */
export const WARM_UP: ColosseumState = { explode: 0.5, build: 1, velarium: 0.5, ruin: 0.5, restore: 0.5, floor: 0.5 };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const span = (t: number, from: number, to: number) => ease((t - from) / (to - from));

/**
 * The maquette for each chapter (0 prologue, 1 Tibur, 2 construction, 3 the games, 4 the earthquake, 5 today, 6 explore) at progress
 * `t`. Every chapter starts in the state the previous one ends in, so scrolling is continuous both ways. The chapters themselves are
 * in src/data/stories/rome.ts (same order).
 */
export function stateFor(chapter: number, t: number): ColosseumState {
  switch (chapter) {
    case 0:
      return { ...REST };
    case 1:
      // The ruin heals into the complete building, which is then taken apart into its layers.
      return { ...REST, ruin: 1 - span(t, 0, 0.3), floor: span(t, 0, 0.3), explode: span(t, 0.3, 1) };
    case 2:
      // The pieces come together, the stone comes down from the top and rises again, level by level.
      return {
        ...REST,
        ruin: 0,
        floor: 1,
        explode: 1 - span(t, 0, 0.3),
        build: t < 0.33 ? 1 - span(t, 0.05, 0.3) : span(t, 0.4, 1),
      };
    case 3:
      return { ...REST, ruin: 0, floor: 1, velarium: span(t, 0.1, 0.8) };
    case 4:
      // The awning is taken in, the south side of the facade falls and the arena empties.
      return { ...REST, velarium: 1 - span(t, 0, 0.2), ruin: span(t, 0.15, 0.85), floor: 1 - span(t, 0.7, 1) };
    case 5:
      return { ...REST, restore: span(t, 0.2, 0.7) };
    default:
      return { ...REST, restore: 1 };
  }
}

/** With reduced motion each chapter shows the state it ends in. */
export const finalStateFor = (chapter: number): ColosseumState => stateFor(chapter, 1);

/**
 * Explore (the last chapter): the drag turns the maquette within these limits (degrees) and the view buttons switch between these
 * states. View ids match the buttons of the chapter in src/data/stories/rome.ts; the first one is the chapter's own state.
 */
export const EXPLORE = {
  chapter: 6,
  orbit: { yaw: 40, pitchUp: 16, pitchDown: 4 },
  views: {
    today: { ...REST, restore: 1 },
    built: { ...REST, ruin: 0, floor: 1, velarium: 1 },
    exploded: { ...REST, ruin: 0, floor: 1, explode: 1 },
  } satisfies Record<string, ColosseumState>,
};

/** One shot per chapter (same order as `stateFor`). The maquette stays on the right of the frame (text on the left); the broken side faces +z. */
const KEYS: readonly CameraKey[] = [
  { position: [-190, 140, 290], target: [0, 14, 0], fov: 38 },
  { position: [-300, 200, 380], target: [0, 50, 0], fov: 40 },
  { position: [300, 150, 300], target: [0, 20, 0], fov: 40 },
  { position: [-130, 200, 270], target: [0, 25, 0], fov: 40 },
  { position: [-60, 95, 320], target: [0, 18, 0], fov: 38 },
  { position: [260, 100, 230], target: [0, 16, 0], fov: 38 },
  { position: [-200, 130, 290], target: [0, 16, 0], fov: 40 },
];

/** Share at the end of each chapter where the camera is already in its pose (it travels there while the text comes in). */
const HOLD = [0, 0.3, 0.3, 0.3, 0.3, 0.3, 0.25] as const;

export const ROME_TRACK: CameraTrack = { keys: KEYS, hold: HOLD };
