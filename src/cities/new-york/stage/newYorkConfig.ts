import { colorNumber } from '../../theme';
import { meta } from '../meta';
import type { MonumentEnvironment } from '../../../engine/stages/shared/monument';
import { CUT_FACING, FORT_HEIGHT, PEDESTAL_TOP, VIEWS } from './libertyStates';
import type { CameraKey, CameraTrack } from '../../../engine/stages/shared/StoryCamera';

/**
 * New York: the Statue of Liberty as a plaster maquette at cold dawn (docs/ART-DIRECTION.md, docs/briefs/new-york.md). Identity: abyss
 * green ground, verdigris accent, salt haze at ground level. Everything the stage needs is here: the scene, the measures and colors of
 * the model, the story states and the camera. Measures in meters (NPS, Statue Statistics). Model axes: the statue faces +z, her torch
 * arm is on -x (the left of the screen seen from the front); `y = 0` is the ground under Fort Wood.
 */

export const LIBERTY_MODEL = {
  /** Fort Wood: an 11-pointed star (1808-1811). Radii and height are of the maquette. */
  fort: { points: 11, outer: 54, inner: 43, height: FORT_HEIGHT },
  /** From the ground to the top of the pedestal: where the heels of the statue stand. */
  pedestalTop: PEDESTAL_TOP,
  /** From the base of the statue to the tip of the torch (46.05) and from heel to head (33.86). */
  torchTop: 46.05,
  heelToHead: 33.86,
  headHeight: 5.26,
} as const;

/** Top of the body under the neck (the head starts there). */
export const NECK_Y = LIBERTY_MODEL.heelToHead - LIBERTY_MODEL.headHeight;
export const FORT_TOP = LIBERTY_MODEL.fort.height;

/**
 * The sculpted figure (public/models/liberty.glb, real scale in meters: feet and small base at y = 0, facing +z, torch toward -x).
 * Model "Statue Of Liberty" by gravityjack (Sketchfab), CC BY 4.0. The body is cut in rings by height (the layers that
 * part in the exploded view); the `skin` state removes the front half with a plane (`CUT_FACING`). Regions approximate: TUNE BY EYE.
 */
export const FIGURE = {
  url: '/models/liberty.glb',
  credit: { href: 'https://sketchfab.com/3d-models/84094e8d5e724b5c882cf576ca12e44e' },
  // The sculpted flame floats over the cup and leans back (it read as a loose piece): it is dropped and the emissive flame stands in the cup.
  flameFrom: 43.4,
  cuts: {
    rings: 8,
    center: [0, 0],
    plinthTop: 2,
    bodyTop: NECK_Y,
    // Raised arm: from the shoulder up, left of x = -2.8; from y = 30 the piece of the mesh that reaches the torch (above y = 36).
    arm: { minY: 26, maxX: -2.8, tipY: 36, splitY: 30 },
    torchPartY: 37,
    crownY: 31.8,
    tablet: { minX: 5.5, minY: 18, maxY: 25 },
  },
} as const;

/** The figure is cut in rings by height: the layers that part in the exploded view. */
export const SKIN_CUTS = { rings: FIGURE.cuts.rings } as const;

/** Same stone on every visit. */
export const SEED = 1886;

const PEDESTAL_HEIGHT = 4;
/** Base of the maquette: the top of the exhibit pedestal. */
export const BASE_Y = 0;

/** The scene around the maquette. Ground and accent: the colors come from `meta.theme`. */
export const NEW_YORK_ENV: MonumentEnvironment = {
  backdrop: colorNumber(meta.theme.ground),
  floorY: BASE_Y - PEDESTAL_HEIGHT,
  fog: { near: 320, far: 820 },
  floor: { color: 0x081110, roughness: 0.7 },
  pedestal: { width: 130, depth: 130, height: PEDESTAL_HEIGHT, color: 0x84827c, bevel: 0.2 },
  // Cold dawn over the harbor: a cool spot with a faint green cast.
  spot: { position: [-85, 260, 130], target: [0, 55, 0], angle: 20, penumbra: 0.9, intensity: 2.7, color: 0xe4f2ec, softness: 3, decay: 2, cookie: true },
  beam: { angle: 12, opacity: 0.04, color: 0xd8eee6 },
  fill: { sky: 0xcbe0d8, ground: 0x12201d, intensity: 0.5 },
  rim: { color: 0x93c9d6, intensity: 0.4, position: [170, 120, -250] },
  contact: { opacity: 0.4, width: 120, depth: 120 },
  // The air is salt haze near the ground (`MIST`), not dust in the beam.
  dust: null,
  shadows: true,
  shadowFar: 560,
  bias: -0.0003,
  normalBias: 0.15,
  look: { exposure: 1.05, aoStrength: 0.6, aoRadius: 4, grain: 0.015, warmth: 0.04, vignette: 0.3, filmic: 0.2, outline: 0.55, outlineWidth: 1, outlineColor: 0x1b1a17 },
  framingX: 0.24,
};

/** Plaster of the maquette and its three toon bands (shadow, mid, light: share of the lit color). */
export const PLASTER = {
  color: 0xf4efe6,
  bands: [0.42, 0.72, 1] as const,
} as const;

/** Instance tints (multiplied by the plaster): the stone of the pedestal and the iron sit a shade apart. */
export const TINT = {
  plaster: 0xffffff,
  stoneDark: 0xcfc9bb,
  stoneMid: 0xdcd6c8,
  stoneLight: 0xe9e4d8,
  iron: 0xd2cbbb,
} as const;

/** The accent of New York (verdigris): the skeleton in chapter 1, the pedestal as it rises, the front of the color change, the part under the finger. */
export const ACCENT = colorNumber(meta.theme.accent);

/**
 * The skin. Today she is the green everyone knows (`patinaTint`: share of the accent mixed into white; high so copper → green reads
 * as two colors, not three); new copper is only the color of the chapters of 1884-1886. The front of the change in chapter 5
 * blends `band` meters behind it and `soft` meters ahead of it.
 */
export const SKIN_COLOR = {
  copper: 0xc57b48,
  patinaTint: 0.85,
  band: 4,
  soft: 0.8,
} as const;

/** The torch: emissive flame, its glow and the light it throws on the arm and the crown. */
export const TORCH = {
  flame: 0xffcf80,
  glow: 0xffb55e,
  glowRadius: 6.5,
  glowOpacity: 0.55,
  light: { color: 0xffc47c, intensity: 90, distance: 70 },
} as const;

/** Salt haze at ground level: two soft sheets of cold light (the fort rises out of the lower one). */
export const MIST = {
  color: 0xb4d4ca,
  low: { y: 1, size: 560, opacity: 0.24 },
  high: { y: FORT_TOP + 1.4, size: 300, opacity: 0.1 },
} as const;

/** A piece of stone of Hunt's pedestal: box centered at (x, z) between heights y0 and y1 (m above the ground). */
export interface StonePiece {
  x: number;
  z: number;
  w: number;
  d: number;
  y0: number;
  y1: number;
  tint: number;
}

const tier = (w: number, y0: number, y1: number, tint: number): StonePiece => ({ x: 0, z: 0, w, d: w, y0, y1, tint });

/** The loggia: a ring of posts (1.4 m) around the core, four on the front and back, two on each side. */
const LOGGIA = { y0: 24, y1: 32, core: 12.4, post: 1.4, ring: 6.4 } as const;
const loggiaPosts: StonePiece[] = [-LOGGIA.ring, -2.1, 2.1, LOGGIA.ring].flatMap((x) =>
  [-LOGGIA.ring, LOGGIA.ring].map((z) => ({ x, z, w: LOGGIA.post, d: LOGGIA.post, y0: LOGGIA.y0, y1: LOGGIA.y1, tint: TINT.stoneLight })),
);
loggiaPosts.push(
  ...[-2.1, 2.1].flatMap((z) => [-LOGGIA.ring, LOGGIA.ring].map((x) => ({ x, z, w: LOGGIA.post, d: LOGGIA.post, y0: LOGGIA.y0, y1: LOGGIA.y1, tint: TINT.stoneLight }))),
);

/** The pedestal of Richard Morris Hunt, from the fort up to where the statue stands: foundation, base, loggia, shaft and cornice. */
export const PEDESTAL_PIECES: readonly StonePiece[] = [
  tier(27.7, FORT_TOP, 12, TINT.stoneDark),
  tier(19.6, 12, 24, TINT.stoneMid),
  tier(LOGGIA.core, LOGGIA.y0, LOGGIA.y1, TINT.stoneDark),
  ...loggiaPosts,
  tier(13.8, 32, 44, TINT.stoneMid),
  tier(16.4, 44, LIBERTY_MODEL.pedestalTop, TINT.stoneLight),
];

/** Layers of the statue: each one moves, rises and falls by itself in the exploded view. Bottom to top, then head and torch arm. */
export type Layer = 'iron' | `ring${number}` | 'head' | 'torch';
export const RING_LAYERS: readonly Layer[] = Array.from({ length: SKIN_CUTS.rings }, (_, index) => `ring${index}` as Layer);
/** Order in which the layers leave (the upper ones first) and come back (the lower ones first). */
export const LAYER_ORDER: readonly Layer[] = [...RING_LAYERS, 'head', 'torch'];

/** Meters each layer rises in the exploded view. The skeleton stays where it is. */
export const EXPLODE_LIFT: Record<Layer, number> = {
  iron: 0,
  ring0: 0,
  ring1: 5,
  ring2: 10,
  ring3: 15.5,
  ring4: 21,
  ring5: 27,
  ring6: 33,
  ring7: 39,
  head: 48,
  torch: 56,
};

export { REST, WARM_UP, stateFor, finalStateFor, type LibertyState } from './libertyStates';

/**
 * Explore (the last chapter): the drag turns the maquette within these limits (degrees) and the view buttons switch between these
 * states. View ids match the buttons of the chapter in src/cities/new-york/story.ts; the first one is the chapter's own state. The
 * pedestal stays up in all of them so the camera frames the same figure.
 */
export const EXPLORE = {
  chapter: 6,
  orbit: { yaw: Infinity, pitchUp: 14, pitchDown: 4 },
  views: VIEWS,
};

/**
 * One shot per chapter (same order as `stateFor`). The statue is very vertical (93 m with the pedestal): wide open frames, the
 * maquette on the right of the screen (text on the left). 20 % closer than the first pass (except chapter 3, the exploded view) so she reads as big as the other monuments. TUNE BY EYE with `npm run dev` (1440x900, 1366x768, 390x844).
 */
const KEYS: readonly CameraKey[] = [
  { position: [-96, 59, 156], target: [0, 47, 0], fov: 38 },
  // Chapter 1 looks at the side that the section removes (`CUT_FACING`), so it sees into the figure.
  { position: [CUT_FACING[0], 27, CUT_FACING[1]], target: [0, 24, 0], fov: 36 },
  { position: [-24, 35, 104], target: [0, 29, 0], fov: 38 },
  { position: [-190, 170, 230], target: [0, 78, 0], fov: 42 },
  { position: [-50, 32, 78], target: [0, 80, 0], fov: 40 },
  { position: [120, 56, 148], target: [0, 47, 0], fov: 38 },
  { position: [-100, 54, 160], target: [0, 47, 0], fov: 40 },
];

/** Share at the end of each chapter where the camera is already in its pose (it travels there while the text comes in). */
const HOLD = [0, 0.3, 0.3, 0.3, 0.3, 0.3, 0.25] as const;

export const NEW_YORK_TRACK: CameraTrack = { keys: KEYS, hold: HOLD };
