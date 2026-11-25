import { colorNumber } from '../../theme';
import { meta } from '../meta';
import type { MonumentEnvironment } from '../../../engine/stages/shared/monument';
import type { CameraKey, CameraTrack } from '../../../engine/stages/shared/StoryCamera';

/**
 * San Francisco: the Golden Gate Bridge as a maquette at evening fog (docs/ART-DIRECTION.md, docs/briefs/san-francisco.md). Identity:
 * fog gray ground, International Orange. The maquette is painted, not plaster (exception of the brief, only for this city): orange in
 * the prologue and Explore, red lead primer while it is built, the Navy's stripes in chapter 5. Everything the stage needs is here.
 *
 * Model axes: the bridge runs along x (San Francisco on -x, Marin on +x), the roadway across z, `y = 0` is the water. The model is
 * built in real meters (Golden Gate Bridge District, Design & Construction Stats) and its root is scaled by `SCALE`; the environment
 * and the camera are in scene units (meters x `SCALE`).
 */

/** Scene units per real meter: the bridge (2,737 m) is 328 units long and the towers (227 m) 27 units tall. */
export const SCALE = 0.12;
const scene = (meters: number) => meters * SCALE;

/** Real measures in meters. */
export const BRIDGE = {
  halfLength: 1368.5,
  /** The towers stand at `x = ±towerX`: the main span is 1,280 m. */
  towerX: 640,
  /** Side span between a tower and its anchorage (343 m). */
  sideSpan: 343,
  /** Where the cable ends in the anchorage (x and height). */
  cableEndX: 990,
  cableEndY: 56,
  towerTop: 227,
  /** Top of the piers: where the legs of the towers start (13 m above the water at San Francisco). */
  pierTop: 13,
  /** Roadway: 152 m under the top of the towers. */
  deckY: 75,
  deckWidth: 27,
  /** The cables run over the legs and carry the trusses: 27.4 m apart. */
  cableZ: 13.7,
  /** Sag of the main span: one ninth of it. */
  sag: 1280 / 9,
  cableRadius: 2.2,
} as const;

/** Height of the main cable at `x` (parabola over the main span, almost a straight line down each side span to its anchorage). */
export function cableHeight(x: number): number {
  const { towerX, towerTop, sag, cableEndX, cableEndY } = BRIDGE;
  const distance = Math.abs(x);
  if (distance <= towerX) return towerTop - sag + sag * (distance / towerX) ** 2;
  const along = distance - towerX;
  const slope = (2 * sag) / towerX;
  const reach = cableEndX - towerX;
  const bend = (cableEndY - towerTop + slope * reach) / reach ** 2;
  return towerTop - slope * along + bend * along * along;
}

/** The towers: two legs of stepped cells, ribs on their faces and portals above the roadway. */
export const TOWER = {
  cells: 14,
  /** Leg section at the first and at the last cell (m along x, m across z). */
  base: { x: 8.2, z: 5.6 },
  top: { x: 5, z: 4 },
  /** Heights of the portals above the roadway. */
  portals: [98, 138, 176, 212],
  portalHeight: 9,
  /** Cross bracing under the roadway: heights of the bays. */
  bays: [13, 31, 49, 66],
} as const;

/** Stiffening truss and roadway slab (heights of their centers, m). */
export const DECK = { slabY: 74.2, slabThickness: 1.6, topChordY: 75.6, bottomChordY: 67.4, trussDepthTop: 76.2, trussBottom: 67.9 } as const;

/** Fort Point arch, under the roadway at the San Francisco end. */
export const ARCH = { x: -1130, halfSpan: 50, footY: 40, rise: 30, ribZ: 10 } as const;

/** The safety net under the roadway (tower to tower, 3 m outside the trusses). */
export const NET = { y: 64.5, halfWidth: 17.3, pitch: 20, lines: 14 } as const;

/** Same stone on every visit. */
export const SEED = 1937;

const PEDESTAL_HEIGHT = 4;
/** Base of the maquette: the top of the exhibit pedestal is the water. */
export const BASE_Y = 0;

/** The scene around the maquette. Ground: the color comes from `meta.theme`. */
export const SAN_FRANCISCO_ENV: MonumentEnvironment = {
  backdrop: colorNumber(meta.theme.ground),
  floorY: BASE_Y - PEDESTAL_HEIGHT,
  fog: { near: 430, far: 1150 },
  floor: { color: 0x1b1a18, roughness: 0.7 },
  // Long and low: the bridge is 12:1 and its ends are cut at the edge of the pedestal, with no shore, hills or city.
  pedestal: { width: scene(2 * BRIDGE.halfLength) + 20, depth: 30, height: PEDESTAL_HEIGHT, color: 0x84827c, bevel: 0.2 },
  // Warm, low evening light. The fall-off toward the tops of the towers is in the paint (`shade`), the spot is the same for all.
  spot: { position: [-30, 300, 90], target: [0, 20, 0], angle: 34, penumbra: 0.55, intensity: 3.3, color: 0xffe6cc, softness: 3, decay: 2, cookie: true },
  beam: { angle: 26, opacity: 0.075, color: 0xffe2c0 },
  fill: { sky: 0xd8d4cc, ground: 0x1b1a18, intensity: 0.35 },
  // A faint cool counter-light from the Pacific (+z).
  rim: { color: 0x9db8cc, intensity: 0.4, position: [60, 120, 300] },
  contact: { opacity: 0.4, width: scene(2 * BRIDGE.halfLength) + 10, depth: 28 },
  // The air is the fog under the roadway (`MIST`), not dust in the beam.
  dust: null,
  shadows: true,
  shadowFar: 450,
  bias: -0.0004,
  normalBias: 0.2,
  look: { exposure: 1.05, aoStrength: 0.6, aoRadius: 1.6, grain: 0.015, warmth: 0.06, vignette: 0.3, filmic: 0.2, outline: 0.55, outlineWidth: 1, outlineColor: 0x1b1a17 },
  framingX: 0.24,
};

/** Toon bands of the maquette (shadow, mid, light: share of the lit color). The material is white: every piece carries its own color. */
export const PLASTER = { color: 0xffffff, bands: [0.42, 0.72, 1] as const } as const;

/**
 * Colors of the maquette. Orange: the light band of International Orange (`#D9573F`; mid `#C0362C`, shadow `#5C2019` come from the
 * bands) over a stone-gray base. Hex of the orange TO VALIDATE against photos (brief §8). Plaster light is the material of whatever
 * the story is changing (the span that rises, the cable front, the deck edges, the net) and the color of a part chosen in Explore.
 */
export const COLORS = {
  orange: 0xd9573f,
  primer: 0x9a4a30,
  stripeBlack: 0x34312c,
  stripeYellow: 0xe2be2e,
  plasterLight: 0xf3eee4,
  stoneDark: 0xcfc9bb,
  stoneMid: 0xdcd6c8,
  stoneLight: 0xe9e4d8,
} as const;

/** How much the paint darkens toward the top of the towers: Morrow's lighting fades upward, so the towers keep rising in the dark. */
export const TOP_SHADE = 0.32;

/** Fog at water level, under the roadway (real meters, centered on the bridge): `size` along x and across z. */
export const MIST = {
  color: 0xd7d3cb,
  low: { y: 3, size: [3300, 420] as const, opacity: 0.28 },
  high: { y: 34, size: [2800, 380] as const, opacity: 0.1 },
} as const;

/**
 * State of the maquette, each 0..1. `towers`: 0 = only piers and anchorages, 0..0.5 raises the Marin tower cell by cell and 0.5..1 the
 * San Francisco one. `cables`: 0..0.8 spins both cables from anchorage to anchorage, 0.8..1 drops the hangers. `deck`: grows from each
 * tower toward the center and the shores. `net`: the net under the roadway. `primer`: 0 = International Orange, 1 = red lead.
 * `stripes`: the Navy's stripes over the paint. `cover`: the front of the orange (from the tops of the towers down and out to the center
 * and the shores); it covers whatever is under it, so 1 = everything orange.
 */
export interface BridgeState extends Record<string, number> {
  towers: number;
  cables: number;
  deck: number;
  net: number;
  primer: number;
  stripes: number;
  cover: number;
}

/** Today: finished, orange. */
export const REST: BridgeState = { towers: 1, cables: 1, deck: 1, net: 0, primer: 0, stripes: 0, cover: 1 };
/** State the shaders are compiled in: every kind of piece and color on screen (partial growth, net, primer, stripes and the front of the orange). */
export const WARM_UP: BridgeState = { towers: 0.5, cables: 0.5, deck: 0.5, net: 1, primer: 0.5, stripes: 0.5, cover: 0.5 };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const span = (t: number, from: number, to: number) => ease((t - from) / (to - from));

/**
 * The maquette for each chapter (0 prologue, 1 towers, 2 cables, 3 deck, 4 net, 5 color, 6 explore) at progress `t`. Every chapter
 * starts in the state the previous one ends in, so scrolling is continuous both ways. The chapters themselves are in
 * src/cities/san-francisco/story.ts (same order).
 */
export function stateFor(chapter: number, t: number): BridgeState {
  const built = { towers: 1, cables: 1, deck: 1 };
  const rough = { net: 0, primer: 1, stripes: 0, cover: 0 };
  switch (chapter) {
    case 0:
      return { ...REST };
    case 1:
      // Back to 1933: the bridge goes down to its piers and anchorages and turns to red lead, then the Marin tower and the San Francisco one rise.
      return { towers: span(t, 0.05, 0.75), cables: 0, deck: 0, ...rough };
    case 2:
      return { towers: 1, cables: span(t, 0.05, 0.75), deck: 0, ...rough };
    case 3:
      return { towers: 1, cables: 1, deck: span(t, 0.05, 0.8), ...rough };
    case 4:
      return { ...built, ...rough, net: span(t, 0.05, 0.5) };
    case 5:
      // The net goes and the Navy's stripes cover the red lead while the text comes in. Progress ends when the text is read
      // (as in New York's skeleton), so the stripes stay through it and the orange covers them as Explore comes in.
      return { ...built, ...rough, net: 1 - span(t, 0, 0.3), stripes: span(t, 0.35, 0.75) };
    case 6:
      return { ...built, net: 0, primer: 1 - span(t, 0.25, 0.35), stripes: 1, cover: span(t, 0, 0.35) };
    default:
      return { ...REST };
  }
}

/** With reduced motion each chapter shows the state it ends in. */
export const finalStateFor = (chapter: number): BridgeState => stateFor(chapter, 1);

/** The views of Explore (ids of the buttons in story.ts). The first one is the chapter's own state. */
export const VIEWS = {
  today: { ...REST },
  stripes: { towers: 1, cables: 1, deck: 1, net: 0, primer: 1, stripes: 1, cover: 0 },
  // 1936: red lead, the net up and the roadway not yet closed in the middle.
  '1936': { towers: 1, cables: 1, deck: 0.8, net: 1, primer: 1, stripes: 0, cover: 0 },
} satisfies Record<string, BridgeState>;

/** Explore (the last chapter): the drag turns the maquette within these limits (degrees); the bridge is symmetric, so it turns all the way round. */
export const EXPLORE = {
  chapter: 6,
  orbit: { yaw: Infinity, pitchUp: 14, pitchDown: 4 },
  views: VIEWS,
};

/**
 * One shot per chapter (same order as `stateFor`), in scene units. The bridge is 12:1: no chapter looks at it in profile (it would be
 * a line), all are 3/4 or from inside it (tower, cable, under the roadway). The maquette goes on the right of the screen (text on the
 * left). Chapter 5 is the only whole view: check it at 1366x768 so the span does not pass under the text. TUNE BY EYE with
 * `npm run dev` (1440x900, 1366x768, 390x844).
 */
const KEYS: readonly CameraKey[] = [
  // Prologue: low 3/4 from the San Francisco side, the south tower big on the right and the span going away in a diagonal.
  { position: [-178, 12, -82], target: [-30, 18, 0], fov: 38 },
  // Towers: close and low beside the south tower, looking up.
  { position: [-100, 4, -28], target: [-76.8, 16, 0], fov: 42 },
  // Cables: over the saddle of the Marin tower, looking down the cable.
  { position: [96, 31, -18], target: [20, 15, 0], fov: 42 },
  // Deck: raised 3/4 over the middle of the span, both halves in view.
  { position: [-46, 50, -92], target: [0, 10, 0], fov: 42 },
  // Net: under the roadway, near the water, looking up through the net.
  { position: [-34, 1.6, -15], target: [-6, 8.4, 0], fov: 48 },
  // Color: the whole bridge, higher and further than the prologue.
  { position: [-235, 72, -118], target: [0, 13, 0], fov: 38 },
  // Explore.
  { position: [-190, 46, -108], target: [0, 14, 0], fov: 40 },
];

/** Share at the end of each chapter where the camera is already in its pose (it travels there while the text comes in). */
const HOLD = [0, 0.3, 0.3, 0.3, 0.3, 0.3, 0.25] as const;

export const SAN_FRANCISCO_TRACK: CameraTrack = { keys: KEYS, hold: HOLD };
