import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  Sphere,
  Vector3,
  type Raycaster,
} from 'three';
import { SKY_LAYER } from '../../render/LookPipeline';
import { createRandom } from '../../utils/random';
import { createToonPlaster, type MonumentModel } from '../shared/monument';
import { EiffelDrawing } from './EiffelDrawing';
import {
  ACCENT,
  BASE_Y,
  EIFFEL_MODEL,
  EXPLODE_LIFT,
  halfWidthAt,
  LIGHTS,
  PARIS_ENV,
  pierHalfAt,
  PLASTER,
  REST,
  SEED,
  SPARKLE_MINUTES,
  TIME_ZONE,
  TINT,
  type ParisState,
} from './parisConfig';

type Layer = Exclude<keyof typeof EXPLODE_LIFT, 'spread'>;

/** The parts of the tower that have a card in the Explore chapter (ids of the cards in src/data/stories/paris.ts). */
export type EiffelPart = 'piers' | 'arches' | 'levels' | 'shaft' | 'mast';

/** Order of the layers from the ground up (0..1): the levels leave and return in this order. */
const LAYER_ORDER: Record<Layer, number> = { pier: 0, first: 1 / 6, legs: 2 / 6, second: 3 / 6, shaft: 4 / 6, third: 5 / 6, mast: 1 };

export interface Piece {
  position: Vector3;
  quaternion: Quaternion;
  scale: Vector3;
  layer: Layer;
  tint: number;
  part: EiffelPart;
}

interface Bulb {
  position: Vector3;
  radius: number;
  layer: Layer;
}

const UP = new Vector3(0, 1, 0);
const MAST_BASE_Y = BASE_Y + EIFFEL_MODEL.summit;
const PIER_CORNERS: readonly [number, number][] = [
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
];
/** Posts of one pier in the order that walks around its four faces: (0,0) outer corner, (1,1) inner corner. */
const PIER_POSTS: readonly [number, number][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (from: number, to: number, value: number) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};
const linspace = (from: number, to: number, count: number) => Array.from({ length: count + 1 }, (_, index) => from + ((to - from) * index) / count);
const hash = (index: number, tick: number) => {
  const value = Math.sin(index * 12.9898 + tick * 78.233) * 43758.5453;
  return value - Math.floor(value);
};
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The layer a lattice panel centered at height `h` belongs to. */
function layerAt(h: number): Layer {
  if (h < EIFFEL_MODEL.firstLevel) return 'pier';
  if (h < EIFFEL_MODEL.secondLevel) return 'legs';
  if (h < EIFFEL_MODEL.thirdLevel) return 'shaft';
  return 'third';
}

/** Share of the exploded view a layer has reached: the upper layers leave first and come back last. */
function layerExplode(layer: Layer, explode: number) {
  const from = (1 - LAYER_ORDER[layer]) * 0.5;
  return smooth(from, from + 0.5, explode);
}

const matrix = new Matrix4();
const UNIT_ROTATION = new Quaternion();
const position = new Vector3();
const scale = new Vector3();
const color = new Color();
const accent = new Color(ACCENT);
const warm = new Color(LIGHTS.glow);
const steady = new Color(LIGHTS.steady);
const flash = new Color(LIGHTS.flash);

/** Soft round glow: white in the middle, transparent at the edge. */
function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.35)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new CanvasTexture(canvas);
}

/**
 * The Eiffel Tower as a plaster maquette (docs/ART-DIRECTION.md §6): the real silhouette (`parisConfig`), only boxes, one instanced mesh
 * for the whole iron lattice (posts, X braces, belts, arches, platforms, antenna) and one for the bulbs. `setState` places every
 * piece for a story state (exploded, lit, sparkling, antenna) as a pure function of it; `update` runs the live sparkle.
 */
export class EiffelTower implements MonumentModel<ParisState> {
  readonly root = new Group();
  private readonly pieces: Piece[] = [];
  private readonly bulbs: Bulb[] = [];
  private readonly plaster = createToonPlaster(PLASTER.color, PLASTER.bands);
  private readonly barMesh: InstancedMesh;
  private readonly bulbMesh: InstancedMesh;
  private readonly bulbMaterial = new MeshBasicMaterial({ color: 0xffffff, toneMapped: false, fog: false });
  private readonly bulbGeometry = new IcosahedronGeometry(1, 0);
  private readonly barGeometry = new BoxGeometry(1, 1, 1);
  private readonly glow: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly glowTexture = createGlowTexture();
  private readonly stars: Points<BufferGeometry, PointsMaterial>;
  private readonly drawing: EiffelDrawing;
  private readonly parisMinute = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, minute: 'numeric' });
  private state: ParisState = { ...REST };
  private highlight: EiffelPart | null = null;
  /** Live sparkle: strength now (0..1), beat counter, clock, and the hourly window checked once a second. */
  private sparkleLevel = 0;
  private tick = 0;
  private clock = 0;
  private windowCheckedAt = 0;
  private windowOpen = false;
  private hourTimer: number | null = null;

  constructor(seed = SEED) {
    this.root.name = 'eiffel-tower';
    this.buildLattice();
    this.buildPlatforms();
    this.buildArches();
    this.buildMast();

    this.barMesh = new InstancedMesh(this.barGeometry, this.plaster.material, this.pieces.length);
    this.barMesh.name = 'eiffel-iron';
    this.barMesh.castShadow = true;
    this.barMesh.receiveShadow = true;
    this.barMesh.frustumCulled = false;
    // Fixed bounds: the exploded view reaches far above the rest pose, and picking tests the sphere first.
    this.barMesh.boundingSphere = new Sphere(new Vector3(0, 200, 0), 800);
    this.barMesh.setColorAt(0, new Color(1, 1, 1));

    this.bulbMesh = new InstancedMesh(this.bulbGeometry, this.bulbMaterial, this.bulbs.length);
    this.bulbMesh.name = 'eiffel-bulbs';
    this.bulbMesh.frustumCulled = false;
    // Out of the G-buffer pass: the bulbs are light, not shapes for the ink line or the occlusion.
    this.bulbMesh.layers.set(SKY_LAYER);
    this.bulbMesh.setColorAt(0, steady);

    const size = PARIS_ENV.pedestal.width;
    this.glow = new Mesh(
      new PlaneGeometry(size, size).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ map: this.glowTexture, color: LIGHTS.glow, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }),
    );
    this.glow.position.y = BASE_Y + 0.25;
    this.glow.layers.set(SKY_LAYER);
    this.glow.frustumCulled = false;

    this.stars = this.buildStars(seed);
    this.root.add(this.barMesh, this.bulbMesh, this.glow, this.stars);
    this.drawing = new EiffelDrawing(this.pieces.filter((piece) => piece.layer !== 'mast'));
    this.root.add(this.drawing.root);
    this.setState(REST);
  }

  // ---------- Building the pieces ----------

  private addBar(from: Vector3, to: Vector3, thickness: number, layer: Layer, part: EiffelPart, tint: number = TINT.plaster) {
    const direction = new Vector3().subVectors(to, from);
    const length = direction.length();
    if (length < 0.3) return;
    this.pieces.push({
      position: new Vector3().addVectors(from, to).multiplyScalar(0.5),
      quaternion: new Quaternion().setFromUnitVectors(UP, direction.divideScalar(length)),
      scale: new Vector3(thickness, length, thickness),
      layer,
      tint,
      part,
    });
  }

  private addBox(x: number, y: number, z: number, sx: number, sy: number, sz: number, layer: Layer, part: EiffelPart, tint: number = TINT.plaster) {
    this.pieces.push({ position: new Vector3(x, y, z), quaternion: new Quaternion(), scale: new Vector3(sx, sy, sz), layer, tint, part });
  }

  private addBulb(point: Vector3, radius: number, layer: Layer) {
    // Pushed outward a little so the bulb sits on the face of the post and not inside it.
    const push = radius + 0.4;
    const out = new Vector3(Math.sign(point.x) * push, 0, Math.sign(point.z) * push);
    this.bulbs.push({ position: point.clone().add(out), radius, layer });
  }

  /** The lattice: four piers (four posts each) up to the second level, then one shaft of four posts. Posts, X braces and belts. */
  private buildLattice() {
    const { firstLevel, secondLevel, thirdLevel, summit } = EIFFEL_MODEL;
    const levels = [
      ...linspace(0, firstLevel, 8),
      ...linspace(firstLevel, secondLevel, 7).slice(1),
      ...linspace(secondLevel, thirdLevel, 14).slice(1),
      ...linspace(thirdLevel, summit, 2).slice(1),
    ];
    const postAt = (h: number, sx: number, sz: number, a: number, b: number) => {
      const half = halfWidthAt(h);
      const pier = 2 * pierHalfAt(h);
      return new Vector3(sx * (half - a * pier), BASE_Y + h, sz * (half - b * pier));
    };

    for (let k = 0; k < levels.length - 1; k++) {
      const h0 = levels[k];
      const h1 = levels[k + 1];
      const hm = (h0 + h1) / 2;
      const w = halfWidthAt(hm) / EIFFEL_MODEL.baseHalf;
      const post = 1.8 + 1.6 * w;
      const brace = 1.1 + 0.9 * w;
      const belt = 1.3 + 1.0 * w;
      const layer = layerAt(hm);
      const inPiers = h1 <= secondLevel + 1e-6;
      const part: EiffelPart = inPiers ? 'piers' : 'shaft';
      const bulbRadius = 0.9 + 0.6 * w;

      if (inPiers) {
        const piersApart = 2 * pierHalfAt(h0) >= 3;
        const posts = piersApart ? PIER_POSTS : PIER_POSTS.slice(0, 1);
        for (const [sx, sz] of PIER_CORNERS) {
          for (const [a, b] of posts) {
            this.addBar(postAt(h0, sx, sz, a, b), postAt(h1, sx, sz, a, b), post, layer, part);
            this.addBulb(postAt(h1, sx, sz, a, b), bulbRadius, layer);
            if (k === 0) this.addBulb(postAt(h0, sx, sz, a, b), bulbRadius, layer);
          }
          if (!piersApart) continue;
          // Faces of the pier: walk the four posts, an X per face and a belt on top.
          PIER_POSTS.forEach(([a, b], index) => {
            const [c, d] = PIER_POSTS[(index + 1) % PIER_POSTS.length];
            this.addBar(postAt(h0, sx, sz, a, b), postAt(h1, sx, sz, c, d), brace, layer, part, TINT.brace);
            this.addBar(postAt(h0, sx, sz, c, d), postAt(h1, sx, sz, a, b), brace, layer, part, TINT.brace);
            this.addBar(postAt(h1, sx, sz, a, b), postAt(h1, sx, sz, c, d), belt, layer, part, TINT.brace);
          });
        }
        continue;
      }

      // The shaft: one post per corner, an X per face and a belt on top.
      PIER_CORNERS.forEach(([sx, sz], index) => {
        const [nx, nz] = PIER_CORNERS[(index + 1) % PIER_CORNERS.length];
        this.addBar(postAt(h0, sx, sz, 0, 0), postAt(h1, sx, sz, 0, 0), post, layer, part);
        this.addBulb(postAt(h1, sx, sz, 0, 0), bulbRadius, layer);
        this.addBar(postAt(h0, sx, sz, 0, 0), postAt(h1, nx, nz, 0, 0), brace, layer, part, TINT.brace);
        this.addBar(postAt(h0, nx, nz, 0, 0), postAt(h1, sx, sz, 0, 0), brace, layer, part, TINT.brace);
        this.addBar(postAt(h1, sx, sz, 0, 0), postAt(h1, nx, nz, 0, 0), belt, layer, part, TINT.brace);
      });
    }
  }

  /** Three levels (slab and parapet) and the cap of the summit. */
  private buildPlatforms() {
    const { firstLevel, secondLevel, thirdLevel, summit } = EIFFEL_MODEL;
    const slab = (level: number, extra: number, thickness: number, layer: Layer, parapet: boolean) => {
      const half = halfWidthAt(level) + extra;
      const y = BASE_Y + level;
      this.addBox(0, y, 0, 2 * half, thickness, 2 * half, layer, 'levels', TINT.platform);
      if (!parapet) return;
      const rail = thickness * 0.6;
      const railY = y + thickness / 2 + rail / 2;
      for (const side of [-1, 1]) {
        this.addBox(0, railY, side * (half - 0.3), 2 * half, rail, 0.6, layer, 'levels', TINT.platform);
        this.addBox(side * (half - 0.3), railY, 0, 0.6, rail, 2 * half, layer, 'levels', TINT.platform);
      }
    };
    slab(firstLevel, 2, 2.8, 'first', true);
    slab(secondLevel, 1.6, 2.4, 'second', true);
    slab(thirdLevel, 2.2, 2.2, 'third', false);
    // Cap of the summit: the beacon room under the antenna.
    const capHalf = halfWidthAt(summit) + 0.9;
    this.addBox(0, BASE_Y + summit + 1.2, 0, 2 * capHalf, 2.4, 2 * capHalf, 'third', 'shaft', TINT.platform);
  }

  /** The great arches between the piers: two concentric half-ellipses on each of the four sides. */
  private buildArches() {
    const { halfSpan, height, planeOffset } = EIFFEL_MODEL.arch;
    const bands = [
      { scale: 1, thickness: 2.6, bulbs: true },
      { scale: 0.86, thickness: 1.3, bulbs: false },
    ];
    const steps = 22;
    for (const { scale: bandScale, thickness, bulbs } of bands) {
      const along = (index: number) => {
        const angle = (Math.PI * index) / steps;
        return { x: halfSpan * bandScale * Math.cos(angle), y: height * bandScale * Math.sin(angle) };
      };
      for (const side of [-1, 1]) {
        const onZ = (x: number, y: number) => new Vector3(x, BASE_Y + y, side * planeOffset);
        const onX = (x: number, y: number) => new Vector3(side * planeOffset, BASE_Y + y, x);
        for (const place of [onZ, onX]) {
          for (let index = 0; index < steps; index++) {
            const from = along(index);
            const to = along(index + 1);
            this.addBar(place(from.x, from.y), place(to.x, to.y), thickness, 'pier', 'arches', TINT.platform);
          }
          if (!bulbs) continue;
          for (let index = 1; index < steps; index += 2) {
            const node = along(index);
            this.addBulb(place(node.x, node.y), 0.9, 'pier');
          }
        }
      }
    }
  }

  /** The antenna of 1909 (raised in `setState` from the summit, in the accent). Stacked tapering bars and a cross arm. */
  private buildMast() {
    const { summit, mastTop } = EIFFEL_MODEL;
    const stack = [
      { from: 0, to: 0.27, thickness: 3.0 },
      { from: 0.27, to: 0.54, thickness: 2.2 },
      { from: 0.54, to: 0.78, thickness: 1.6 },
      { from: 0.78, to: 1, thickness: 0.9 },
    ];
    const rise = mastTop - summit;
    for (const { from, to, thickness } of stack) {
      this.addBar(new Vector3(0, MAST_BASE_Y + 2.4 + rise * from, 0), new Vector3(0, MAST_BASE_Y + 2.4 + rise * to, 0), thickness, 'mast', 'mast');
    }
    this.addBox(0, MAST_BASE_Y + 2.4 + rise * 0.54, 0, 9, 0.7, 0.7, 'mast', 'mast');
  }

  /** A faint star field far above the horizon (out of the G-buffer pass and not touched by the fog). */
  private buildStars(seed: number) {
    const random = createRandom(seed);
    const count = 380;
    const radius = 2200;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index++) {
      const rise = 0.04 + 0.96 * random() ** 0.8;
      const flat = Math.sqrt(1 - rise * rise);
      const turn = random() * Math.PI * 2;
      positions.set([radius * flat * Math.cos(turn), radius * rise, radius * flat * Math.sin(turn)], index * 3);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const stars = new Points(geometry, new PointsMaterial({ color: 0xe8e4ff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
    stars.name = 'stars';
    stars.layers.set(SKY_LAYER);
    stars.frustumCulled = false;
    return stars;
  }

  // ---------- State ----------

  /** Places and colors every piece for a story state. Cheap (about two thousand matrices): call it on the frames where the state moves. */
  setState(state: ParisState) {
    this.state = { ...state };
    const { explode, lights, mast } = state;
    const lit = smooth(0, 1, lights);

    this.pieces.forEach((piece, index) => {
      const lifted = layerExplode(piece.layer, explode);
      const spread = piece.layer === 'pier' ? 1 : 1 + EXPLODE_LIFT.spread * lifted;
      position.set(piece.position.x * spread, piece.position.y, piece.position.z * spread);
      scale.copy(piece.scale);
      if (piece.layer === 'mast') {
        // The antenna grows out of the summit.
        position.y = MAST_BASE_Y + (position.y - MAST_BASE_Y) * mast;
        position.x *= mast;
        position.z *= mast;
        scale.multiplyScalar(mast);
      }
      position.y += EXPLODE_LIFT[piece.layer] * lifted;
      if (piece.layer !== 'mast' && piece.position.y - BASE_Y > state.build * (EIFFEL_MODEL.summit + 5)) scale.setScalar(0);
      matrix.compose(position, piece.quaternion, scale);
      this.barMesh.setMatrixAt(index, matrix);

      color.setHex(piece.tint);
      if (piece.layer === 'mast') {
        color.copy(accent);
      } else {
        if (lit > 0) color.lerp(warm, LIGHTS.warmth * lit);
        if (this.highlight && piece.part === this.highlight) color.lerp(accent, 0.5);
      }
      this.barMesh.setColorAt(index, color);
    });
    this.barMesh.instanceMatrix.needsUpdate = true;
    if (this.barMesh.instanceColor) this.barMesh.instanceColor.needsUpdate = true;

    this.bulbs.forEach((bulb, index) => {
      const lifted = layerExplode(bulb.layer, explode);
      const spread = bulb.layer === 'pier' ? 1 : 1 + EXPLODE_LIFT.spread * lifted;
      position.set(bulb.position.x * spread, bulb.position.y + EXPLODE_LIFT[bulb.layer] * lifted, bulb.position.z * spread);
      scale.setScalar(bulb.radius * lit);
      matrix.compose(position, UNIT_ROTATION, scale);
      this.bulbMesh.setMatrixAt(index, matrix);
    });
    this.bulbMesh.instanceMatrix.needsUpdate = true;
    this.paintBulbs();

    this.glow.visible = lit > 0.01;
    this.drawing.setState(state);
  }

  setHighlight(part: string | null) {
    this.highlight = part as EiffelPart | null;
  }

  /** The first part under the ray (the bulbs and the glow are looked through). */
  pick(raycaster: Raycaster): string | null {
    const [hit] = raycaster.intersectObject(this.barMesh, false);
    return hit && hit.instanceId !== undefined ? this.pieces[hit.instanceId].part : null;
  }

  // ---------- Live sparkle ----------

  /** Steady amber, or during the sparkle a dimmer amber with a random share of the bulbs flashing white-gold each beat. */
  private paintBulbs() {
    const level = this.sparkleLevel;
    this.bulbs.forEach((_, index) => {
      if (level <= 0.01) {
        color.copy(steady);
      } else if (hash(index, this.tick) < LIGHTS.share * level) {
        color.copy(flash);
      } else {
        color.copy(steady).multiplyScalar(1 - LIGHTS.dim * level);
      }
      this.bulbMesh.setColorAt(index, color);
    });
    this.glow.material.opacity = (LIGHTS.glowOpacity + (LIGHTS.sparkleGlow - LIGHTS.glowOpacity) * level) * this.state.lights;
    if (this.bulbMesh.instanceColor) this.bulbMesh.instanceColor.needsUpdate = true;
  }

  /** The real sparkle: the first minutes of every hour in Paris (checked once a second). */
  private isHourlyWindow(): boolean {
    const now = Date.now();
    if (now - this.windowCheckedAt < 1000) return this.windowOpen;
    this.windowCheckedAt = now;
    // TODO: the real show runs only after dark; the maquette sparkles at every hour.
    this.windowOpen = Number(this.parisMinute.format(now)) < SPARKLE_MINUTES;
    return this.windowOpen;
  }

  update(deltaSeconds: number): boolean {
    const level = Math.max(this.state.sparkle, this.isHourlyWindow() ? 1 : 0);
    const sparkling = level > 0.01 && this.state.lights > 0.05 && !prefersReducedMotion();
    if (!sparkling) {
      if (this.sparkleLevel === 0) return false;
      // One last frame back to the steady light.
      this.sparkleLevel = 0;
      this.paintBulbs();
      return true;
    }
    this.sparkleLevel = level;
    this.clock += deltaSeconds;
    const tick = Math.floor(this.clock * LIGHTS.rate);
    if (tick !== this.tick) {
      this.tick = tick;
      this.paintBulbs();
    }
    return true;
  }

  /** Wakes the render loop at the top of every hour, so the sparkle starts by itself even on an idle page. */
  bind(requestFrame: () => void) {
    const scheduleNextHour = () => {
      const wait = 3_600_000 - (Date.now() % 3_600_000) + 250;
      this.hourTimer = window.setTimeout(() => {
        requestFrame();
        scheduleNextHour();
      }, wait);
    };
    scheduleNextHour();
  }

  get current(): ParisState {
    return this.state;
  }

  dispose() {
    if (this.hourTimer !== null) window.clearTimeout(this.hourTimer);
    this.barMesh.dispose();
    this.bulbMesh.dispose();
    this.barGeometry.dispose();
    this.bulbGeometry.dispose();
    this.bulbMaterial.dispose();
    this.glow.geometry.dispose();
    this.glow.material.dispose();
    this.glowTexture.dispose();
    this.stars.geometry.dispose();
    this.stars.material.dispose();
    this.drawing.dispose();
    this.plaster.dispose();
    this.root.removeFromParent();
  }
}
