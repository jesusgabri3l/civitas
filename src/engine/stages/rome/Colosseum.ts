import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Path,
  PlaneGeometry,
  Quaternion,
  Shape,
  Sphere,
  Vector3,
  type Raycaster,
} from 'three';
import { SKY_LAYER } from '../../render/LookPipeline';
import { createRandom, type RandomSource } from '../../utils/random';
import { createToonPlaster, type MonumentModel } from '../shared/monument';
import { ColosseumVelarium } from './ColosseumVelarium';
import {
  ACCENT,
  ATTIC_BASE,
  BASE_Y,
  BUILD_SPAN,
  COLOSSEUM_MODEL,
  EXPLODE_LIFT,
  EXPLODE_SPREAD,
  LEVEL_BASE,
  MIST,
  PLASTER,
  REST,
  RUIN_REACH,
  TINT,
  type ColosseumState,
  type Layer,
} from './romeConfig';

/** The parts of the Colosseum that have a card in the Explore chapter (ids of the cards in src/data/stories/rome.ts). */
export type ColosseumPart = 'arcades' | 'attic' | 'cavea' | 'arena' | 'buttress';

type SetKey = 'bay1' | 'bay2' | 'bay3' | 'attic' | 'shaft' | 'block' | 'ring0' | 'ring1' | 'ring2' | 'ring3' | 'ring4' | 'floor';
const SET_KEYS: readonly SetKey[] = ['bay1', 'bay2', 'bay3', 'attic', 'shaft', 'block', 'ring0', 'ring1', 'ring2', 'ring3', 'ring4', 'floor'];

/** `plain` follows the state of its layer; the others answer to one value of their own. */
type Kind = 'plain' | 'mast' | 'floor' | 'debris' | 'buttress';
type FacadeLevel = 'l1' | 'l2' | 'l3' | 'attic';

interface Piece {
  set: SetKey;
  /** Bottom center of the piece at rest. */
  position: Vector3;
  /** Height its layer stands on: pieces grow from here while the maquette is built. */
  baseY: number;
  quaternion: Quaternion;
  scale: Vector3;
  layer: Layer;
  tint: number;
  part: ColosseumPart | null;
  kind: Kind;
  /** The 1349 fall: when it starts (0..1 of `ruin`), or null if the piece stands. */
  fall: number | null;
  /** Last pieces standing at the broken edge: they take a bit of the accent. */
  edge: boolean;
}

type PieceSpec = Pick<Piece, 'set' | 'position' | 'baseY' | 'scale' | 'layer' | 'tint' | 'part'> & Partial<Pick<Piece, 'quaternion' | 'kind' | 'fall' | 'edge'>>;

/** A point on an ellipse, with the yaw that turns a piece to face outward. */
interface Station {
  x: number;
  z: number;
  /** Parametric angle: pi/2 is the south (+z), the side that falls. */
  theta: number;
  yaw: number;
  nx: number;
  nz: number;
}

const FALL_DELAY: Record<FacadeLevel, number> = { attic: 0, l3: 0.1, l2: 0.2, l1: 0.3 };
const FALL_TILT = 0.45;
const DEBRIS = { count: 90, reach: 0.1, nearest: 2, farthest: 24, drop: 45 } as const;
const ORDER_TOP = EXPLODE_LIFT.attic;
/** Columns and capitals of the three arcades: Tuscan, Ionic, Corinthian. */
const ORDERS = [
  { radius: 0.6, capitalWidth: 1.3, capitalHeight: 0.45 },
  { radius: 0.55, capitalWidth: 1.5, capitalHeight: 0.55 },
  { radius: 0.5, capitalWidth: 1.7, capitalHeight: 0.8 },
] as const;
const FACADE_LEVELS: readonly FacadeLevel[] = ['l1', 'l2', 'l3'];

const UP = new Vector3(0, 1, 0);
const AROUND_X = new Vector3(1, 0, 0);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (from: number, to: number, value: number) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};
const wrapAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

const matrix = new Matrix4();
const position = new Vector3();
const scale = new Vector3();
const quaternion = new Quaternion();
const tilt = new Quaternion();
const color = new Color();
const accent = new Color(ACCENT);

/** Share of the exploded view a layer has reached: the upper layers leave first and come back last. */
function layerExplode(layer: Layer, explode: number) {
  const from = (1 - EXPLODE_LIFT[layer] / ORDER_TOP) * 0.5;
  return smooth(from, from + 0.5, explode);
}

/** Points at equal arc length around an ellipse (`offset` 0.5 = the middle of each bay, 0 = the pier between two bays). */
function stationsAround(a: number, b: number, count: number, offset: number) {
  const steps = 2048;
  const travelled = new Float64Array(steps + 1);
  for (let step = 1; step <= steps; step++) {
    const before = ((step - 1) / steps) * Math.PI * 2;
    const after = (step / steps) * Math.PI * 2;
    travelled[step] = travelled[step - 1] + Math.hypot(a * (Math.cos(after) - Math.cos(before)), b * (Math.sin(after) - Math.sin(before)));
  }
  const length = travelled[steps];
  const stations: Station[] = [];
  let step = 0;
  for (let index = 0; index < count; index++) {
    const target = ((index + offset) / count) * length;
    while (step < steps - 1 && travelled[step + 1] < target) step++;
    const share = (target - travelled[step]) / (travelled[step + 1] - travelled[step]);
    const theta = ((step + share) / steps) * Math.PI * 2;
    const nx = Math.cos(theta) / a;
    const nz = Math.sin(theta) / b;
    const norm = Math.hypot(nx, nz);
    stations.push({ x: a * Math.cos(theta), z: b * Math.sin(theta), theta, yaw: Math.atan2(nx / norm, nz / norm), nx: nx / norm, nz: nz / norm });
  }
  return { stations, pitch: length / count };
}

/** One bay of the facade: a wall with an arched opening (`arch`) or with a small window (the attic), thick along z. */
function bayGeometry(width: number, height: number, depth: number, kind: 'arch' | 'attic') {
  const half = width / 2;
  const shape = new Shape();
  if (kind === 'arch') {
    const { opening } = COLOSSEUM_MODEL;
    const radius = opening.width / 2;
    const spring = height * opening.heightShare - radius;
    shape.moveTo(-half, 0);
    shape.lineTo(-radius, 0);
    shape.lineTo(-radius, spring);
    shape.absarc(0, spring, radius, Math.PI, 0, true);
    shape.lineTo(radius, 0);
    shape.lineTo(half, 0);
    shape.lineTo(half, height);
    shape.lineTo(-half, height);
    shape.closePath();
  } else {
    shape.moveTo(-half, 0);
    shape.lineTo(half, 0);
    shape.lineTo(half, height);
    shape.lineTo(-half, height);
    shape.closePath();
    const window = new Path();
    window.moveTo(-0.7, height * 0.45);
    window.lineTo(0.7, height * 0.45);
    window.lineTo(0.7, height * 0.72);
    window.lineTo(-0.7, height * 0.72);
    window.closePath();
    shape.holes.push(window);
  }
  const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

/** A flat elliptical ring (a step of the seating), standing on y = 0. */
function ringGeometry(outerA: number, outerB: number, innerA: number, innerB: number, height: number) {
  const shape = new Shape();
  shape.absellipse(0, 0, outerA, outerB, 0, Math.PI * 2, false, 0);
  const hole = new Path();
  hole.absellipse(0, 0, innerA, innerB, 0, Math.PI * 2, true, 0);
  shape.holes.push(hole);
  const geometry = new ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 96 });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** Soft round sheet of mist: white in the middle, transparent at the edge. */
function createMistTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return new CanvasTexture(canvas);
}

/**
 * The Colosseum as a plaster maquette (docs/ART-DIRECTION.md §6): the real ellipse and its three arcades under the attic, the inner
 * ring, the seating, the arena over the hypogeum and the awning. A few instanced meshes (a bay per level, columns, blocks, one per
 * seating ring); `setState` places every piece for a story state (exploded, built, awning, fallen, restored) as a pure function of it.
 */
export class Colosseum implements MonumentModel<ColosseumState> {
  readonly root = new Group();
  private readonly random: RandomSource;
  private bayPitch = 1;
  private readonly plaster = createToonPlaster(PLASTER.color, PLASTER.bands);
  private readonly pieces = Object.fromEntries(SET_KEYS.map((key) => [key, [] as Piece[]])) as Record<SetKey, Piece[]>;
  private readonly geometries = {} as Record<SetKey, BufferGeometry>;
  private readonly meshes = {} as Record<SetKey, InstancedMesh>;
  private readonly velarium = new ColosseumVelarium();
  private readonly mistTexture = createMistTexture();
  private readonly mist: Mesh<PlaneGeometry, MeshBasicMaterial>[] = [];
  private state: ColosseumState = { ...REST };
  private highlight: ColosseumPart | null = null;

  constructor(seed: number) {
    this.root.name = 'colosseum';
    this.random = createRandom(seed);
    this.buildSeating();
    this.buildArena();
    this.buildFacade();
    this.buildInnerRing();
    this.buildFallenBlocks();
    this.buildButtresses();

    for (const key of SET_KEYS) {
      const mesh = new InstancedMesh(this.geometries[key], this.plaster.material, this.pieces[key].length);
      mesh.name = `colosseum-${key}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      // Fixed bounds: the exploded view reaches far above the rest pose, and picking tests the sphere first.
      mesh.boundingSphere = new Sphere(new Vector3(0, 60, 0), 400);
      mesh.setColorAt(0, new Color(1, 1, 1));
      this.meshes[key] = mesh;
      this.root.add(mesh);
    }
    this.root.add(this.velarium.mesh);
    this.buildMist();
    this.setState(REST);
  }

  // ---------- Building the pieces ----------

  private put(spec: PieceSpec) {
    this.pieces[spec.set].push({ quaternion: new Quaternion(), kind: 'plain', fall: null, edge: false, ...spec });
  }

  private yawOf(station: Station) {
    return new Quaternion().setFromAxisAngle(UP, station.yaw);
  }

  /** The 1349 fall at a point of the facade: when its piece starts to fall (null if it stands) and whether it is on the broken edge. */
  private fallAt(level: FacadeLevel, station: Station) {
    const phi = Math.abs(wrapAngle(station.theta - Math.PI / 2));
    const jitter = this.random();
    const reach = RUIN_REACH[level] + (jitter - 0.5) * 0.1;
    if (phi < reach) return { fall: FALL_DELAY[level] + jitter * 0.15 + (1 - phi / reach) * 0.1, edge: false };
    return { fall: null, edge: phi < reach + 0.12 };
  }

  /** Seating: stepped elliptical rings from the arena out to the inner ring. */
  private buildSeating() {
    const { arena, outer, wall, cavea } = COLOSSEUM_MODEL;
    const reachA = outer.a - wall - arena.a;
    const reachB = outer.b - wall - arena.b;
    const at = (share: number) => ({ a: arena.a + share * reachA, b: arena.b + share * reachB });
    cavea.heights.forEach((height, ring) => {
      const inner = at(cavea.cuts[ring]);
      const edge = at(cavea.cuts[ring + 1]);
      const set = `ring${ring}` as SetKey;
      this.geometries[set] = ringGeometry(edge.a, edge.b, inner.a, inner.b, height);
      this.put({ set, position: new Vector3(0, BASE_Y, 0), baseY: BASE_Y, scale: new Vector3(1, 1, 1), layer: `cavea${ring}` as Layer, tint: TINT.cavea, part: 'cavea' });
    });
  }

  /** The arena floor over the hypogeum: a grid of walls under the sand. */
  private buildArena() {
    const { arena, hypogeumHeight, floorThickness } = COLOSSEUM_MODEL;
    this.geometries.floor = new CylinderGeometry(1, 1, 1, 72).translate(0, 0.5, 0);
    this.put({
      set: 'floor',
      position: new Vector3(0, hypogeumHeight, 0),
      baseY: hypogeumHeight,
      scale: new Vector3(arena.a * 0.99, floorThickness, arena.b * 0.99),
      layer: 'arena',
      tint: TINT.arena,
      part: 'arena',
      kind: 'floor',
    });
    const wallThickness = 1.2;
    const wall = (x: number, z: number, length: number, alongX: boolean) =>
      this.put({
        set: 'block',
        position: new Vector3(x, BASE_Y, z),
        baseY: BASE_Y,
        scale: new Vector3(alongX ? length : wallThickness, hypogeumHeight, alongX ? wallThickness : length),
        layer: 'hypogeum',
        tint: TINT.cavea,
        part: 'arena',
      });
    for (let z = -18; z <= 18; z += 6) wall(0, z, 2 * arena.a * Math.sqrt(1 - (z / arena.b) ** 2) - 1.5, true);
    for (let x = -36; x <= 36; x += 9) wall(x, 0, 2 * arena.b * Math.sqrt(1 - (x / arena.a) ** 2) - 1.5, false);
  }

  /** The facade: three arcades of 80 bays with half columns between them, and the attic with its corbels and masts. */
  private buildFacade() {
    const { outer, wall, bays, levels, attic, mastHeight } = COLOSSEUM_MODEL;
    const mid = { a: outer.a - wall / 2, b: outer.b - wall / 2 };
    const { stations: bayCenters, pitch } = stationsAround(mid.a, mid.b, bays, 0.5);
    const { stations: piers } = stationsAround(mid.a, mid.b, bays, 0);
    this.bayPitch = pitch;
    levels.forEach((height, level) => {
      this.geometries[`bay${level + 1}` as SetKey] = bayGeometry(pitch, height, wall, 'arch');
    });
    this.geometries.attic = bayGeometry(pitch, attic, wall, 'attic');
    this.geometries.shaft = new CylinderGeometry(1, 1, 1, 10).translate(0, 0.5, 0);
    this.geometries.block = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);

    const faceOffset = wall / 2 + 0.15;
    FACADE_LEVELS.forEach((layer, level) => {
      const base = LEVEL_BASE[level];
      const order = ORDERS[level];
      for (const station of bayCenters) {
        const { fall, edge } = this.fallAt(layer, station);
        this.put({ set: `bay${level + 1}` as SetKey, position: new Vector3(station.x, base, station.z), baseY: base, quaternion: this.yawOf(station), scale: new Vector3(1, 1, 1), layer, tint: TINT.plaster, part: 'arcades', fall, edge });
      }
      const shaftHeight = levels[level] - order.capitalHeight - 0.6;
      for (const station of piers) {
        const { fall, edge } = this.fallAt(layer, station);
        const x = station.x + station.nx * faceOffset;
        const z = station.z + station.nz * faceOffset;
        const quaternion = this.yawOf(station);
        this.put({ set: 'shaft', position: new Vector3(x, base, z), baseY: base, quaternion, scale: new Vector3(order.radius, shaftHeight, order.radius), layer, tint: TINT.plaster, part: 'arcades', fall, edge });
        this.put({ set: 'block', position: new Vector3(x, base + shaftHeight, z), baseY: base, quaternion, scale: new Vector3(order.capitalWidth, order.capitalHeight, order.capitalWidth), layer, tint: TINT.plaster, part: 'arcades', fall, edge });
      }
    });

    for (const station of bayCenters) {
      const { fall, edge } = this.fallAt('attic', station);
      this.put({ set: 'attic', position: new Vector3(station.x, ATTIC_BASE, station.z), baseY: ATTIC_BASE, quaternion: this.yawOf(station), scale: new Vector3(1, 1, 1), layer: 'attic', tint: TINT.plaster, part: 'attic', fall, edge });
    }
    const atticTop = ATTIC_BASE + attic;
    for (const station of piers) {
      const { fall, edge } = this.fallAt('attic', station);
      const quaternion = this.yawOf(station);
      const corbel = faceOffset + 0.2;
      this.put({ set: 'block', position: new Vector3(station.x + station.nx * corbel, atticTop - 3.4, station.z + station.nz * corbel), baseY: ATTIC_BASE, quaternion, scale: new Vector3(0.9, 1.8, 1.2), layer: 'attic', tint: TINT.plaster, part: 'attic', fall, edge });
      const mast = wall / 2 - 0.4;
      this.put({ set: 'block', position: new Vector3(station.x + station.nx * mast, atticTop, station.z + station.nz * mast), baseY: atticTop, quaternion, scale: new Vector3(0.5, mastHeight, 0.5), layer: 'attic', tint: TINT.plaster, part: 'attic', kind: 'mast', fall, edge });
    }
  }

  /** The second ring: a lower arcade inside the facade, the one that shows when the facade falls. */
  private buildInnerRing() {
    const { arena, outer, wall, innerShare, innerBays } = COLOSSEUM_MODEL;
    const a = arena.a + innerShare * (outer.a - wall - arena.a);
    const b = arena.b + innerShare * (outer.b - wall - arena.b);
    const { stations, pitch } = stationsAround(a, b, innerBays, 0.5);
    FACADE_LEVELS.forEach((_, level) => {
      // The third level of the inner ring is lower than the facade's.
      const heightShare = level === 2 ? 0.6 : 1;
      for (const station of stations) {
        this.put({ set: `bay${level + 1}` as SetKey, position: new Vector3(station.x, LEVEL_BASE[level], station.z), baseY: LEVEL_BASE[level], quaternion: this.yawOf(station), scale: new Vector3(pitch / this.bayPitch, heightShare, 0.75), layer: 'inner', tint: TINT.inner, part: 'arcades' });
      }
    });
  }

  /** Blocks that fall outside the broken side in 1349 (accent). */
  private buildFallenBlocks() {
    const { outer } = COLOSSEUM_MODEL;
    const rnd = this.random;
    for (let index = 0; index < DEBRIS.count; index++) {
      const side = rnd() < 0.5 ? -1 : 1;
      const theta = Math.PI / 2 + side * rnd() * (RUIN_REACH.attic + DEBRIS.reach);
      const off = DEBRIS.nearest + rnd() * (DEBRIS.farthest - DEBRIS.nearest);
      const size = 1.5 + rnd() * 3.5;
      this.put({
        set: 'block',
        position: new Vector3((outer.a + off) * Math.cos(theta), BASE_Y, (outer.b + off) * Math.sin(theta)),
        baseY: BASE_Y,
        quaternion: new Quaternion().setFromEuler(new Euler((rnd() - 0.5) * 0.5, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.5)),
        scale: new Vector3(size * (0.8 + rnd() * 0.6), size * (0.6 + rnd() * 0.6), size * (0.8 + rnd() * 0.6)),
        layer: 'ground',
        tint: TINT.plaster,
        part: null,
        kind: 'debris',
        fall: rnd() * 0.5,
      });
    }
  }

  /** The brick buttresses of 1807 and 1827 that prop up the ends of the break (accent, they appear with `restore`). */
  private buildButtresses() {
    const { outer } = COLOSSEUM_MODEL;
    for (const side of [-1, 1]) {
      const theta = Math.PI / 2 + side * (RUIN_REACH.l1 - 0.06);
      const nx = Math.cos(theta) / outer.a;
      const nz = Math.sin(theta) / outer.b;
      const norm = Math.hypot(nx, nz);
      const yaw = new Quaternion().setFromAxisAngle(UP, Math.atan2(nx / norm, nz / norm));
      for (const [width, height, depth, out] of [[9, 20, 12, 6], [12, 9, 16, 8]] as const) {
        this.put({
          set: 'block',
          position: new Vector3(outer.a * Math.cos(theta) + (nx / norm) * out, BASE_Y, outer.b * Math.sin(theta) + (nz / norm) * out),
          baseY: BASE_Y,
          quaternion: yaw,
          scale: new Vector3(width, height, depth),
          layer: 'ground',
          tint: TINT.plaster,
          part: 'buttress',
          kind: 'buttress',
        });
      }
    }
  }

  /** Two cold sheets of mist at ground level (out of the ink pass: they are air, not shapes). */
  private buildMist() {
    for (const sheet of [MIST.low, MIST.high]) {
      const mesh = new Mesh(
        new PlaneGeometry(sheet.size, sheet.size).rotateX(-Math.PI / 2),
        new MeshBasicMaterial({ map: this.mistTexture, color: MIST.color, transparent: true, opacity: sheet.opacity, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }),
      );
      mesh.position.y = BASE_Y + sheet.y;
      mesh.layers.set(SKY_LAYER);
      mesh.frustumCulled = false;
      this.mist.push(mesh);
      this.root.add(mesh);
    }
  }

  // ---------- State ----------

  /** Places and colors every piece for a story state. Cheap (about two thousand matrices): call it on the frames where the state moves. */
  setState(state: ColosseumState) {
    this.state = { ...state };
    const { explode, build, velarium, ruin, restore, floor } = state;

    for (const key of SET_KEYS) {
      const mesh = this.meshes[key];
      this.pieces[key].forEach((piece, index) => {
        const lifted = layerExplode(piece.layer, explode);
        const fixed = piece.layer === 'hypogeum' || piece.layer === 'ground';
        const spread = fixed ? 1 : 1 + EXPLODE_SPREAD * lifted;
        const [from, to] = BUILD_SPAN[piece.layer];
        let grown = smooth(from, to, build);
        let drop = 0;
        if (piece.kind === 'mast') grown *= velarium;
        else if (piece.kind === 'floor') grown *= floor;
        else if (piece.kind === 'debris') {
          grown = smooth(piece.fall!, piece.fall! + 0.25, ruin);
          drop = (1 - grown) * DEBRIS.drop;
        } else if (piece.kind === 'buttress') grown = smooth(0, 0.6, restore);

        scale.copy(piece.scale);
        quaternion.copy(piece.quaternion);
        let fallen = 0;
        if (piece.fall !== null && piece.kind !== 'debris') {
          // Pieces of the broken side lean out and sink: the top comes down first.
          fallen = smooth(piece.fall, piece.fall + 0.35, ruin);
          scale.y *= 1 - 0.9 * fallen;
          quaternion.multiply(tilt.setFromAxisAngle(AROUND_X, fallen * FALL_TILT));
        }
        scale.y *= grown;
        // A piece that has not grown yet is hidden whole: a flat one keeps its top face with a zero normal and draws as a dark speck.
        if (scale.y < 1e-3) scale.setScalar(0);
        // A fallen piece comes down to the ground and is gone once it lands: what is left of it are the fallen blocks.
        if (fallen > 0.97) scale.setScalar(0);
        let y = piece.baseY + (piece.position.y - piece.baseY) * grown + EXPLODE_LIFT[piece.layer] * lifted + drop;
        y += (BASE_Y - y) * fallen;
        position.set(piece.position.x * spread, y, piece.position.z * spread);
        matrix.compose(position, quaternion, scale);
        mesh.setMatrixAt(index, matrix);

        color.setHex(piece.tint);
        if (piece.kind === 'debris') color.lerp(accent, 0.75);
        else if (piece.kind === 'buttress') color.lerp(accent, 0.9);
        else if (piece.edge) color.lerp(accent, 0.35 * smooth(0.2, 0.8, ruin));
        if (this.highlight && piece.part === this.highlight) color.lerp(accent, 0.5);
        mesh.setColorAt(index, color);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    this.velarium.setOpen(velarium);
    this.velarium.setHighlighted(this.highlight === 'attic');
  }

  setHighlight(part: string | null) {
    this.highlight = part as ColosseumPart | null;
  }

  /** The first part under the ray (the mist is looked through, and so are the fallen blocks). */
  pick(raycaster: Raycaster): string | null {
    const hits = raycaster.intersectObjects([...SET_KEYS.map((key) => this.meshes[key]), this.velarium.mesh], false);
    for (const hit of hits) {
      if (hit.object === this.velarium.mesh) return 'attic';
      const part = hit.instanceId === undefined ? null : this.pieces[(hit.object.name.replace('colosseum-', '')) as SetKey][hit.instanceId].part;
      if (part) return part;
    }
    return null;
  }

  get current(): ColosseumState {
    return this.state;
  }

  dispose() {
    for (const key of SET_KEYS) {
      this.meshes[key].dispose();
      this.geometries[key].dispose();
    }
    for (const sheet of this.mist) {
      sheet.geometry.dispose();
      sheet.material.dispose();
    }
    this.mistTexture.dispose();
    this.velarium.dispose();
    this.plaster.dispose();
    this.root.removeFromParent();
  }
}
