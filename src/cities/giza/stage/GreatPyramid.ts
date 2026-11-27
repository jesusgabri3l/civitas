import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  Euler,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Sphere,
  Vector3,
  type Raycaster,
} from 'three';
import { SKY_LAYER } from '../../../engine/render/LookPipeline';
import { createRandom } from '../../../engine/utils/random';
import { yieldToMain } from '../../../engine/utils/yieldToMain';
import { applyExploreFocus, createToonPlaster, type MonumentModel } from '../../../engine/stages/shared/monument';
import {
  BAND_HEIGHT,
  BANDS_TODAY,
  CASING_PLASTER,
  casingHalfWidth,
  COLORS,
  coreHalfWidth,
  CUT,
  GIZA_ENV,
  INTERIOR,
  PLASTER,
  PYRAMID,
  REST,
  SAND,
  SCALE,
  SEED,
  type GizaState,
} from './gizaConfig';
import { CASING_INDICES_PER_BAND, CASING_VERTICES_PER_BAND, createCasingGeometry, createCutFaceGeometry } from './gizaGeometry';
import { interiorPoints } from './section';

/** The parts of the pyramid that have a card in the Explore chapter (ids of the cards in src/cities/giza/story.ts). */
export type GizaPart = 'casing' | 'core' | 'entrance' | 'tunnel' | 'gallery' | 'kings-chamber' | 'void';

/** What a piece does with the state: the core rises by bands (and half of it is withdrawn), markers show where the interior is being laid, and so on. */
type Role =
  | { kind: 'core'; band: number; side: 'west' | 'east'; halfWidth: number }
  | { kind: 'marker'; band: number }
  | { kind: 'quarry'; group: number; order: number; count: number }
  | { kind: 'debris'; delay: number; from: Vector3; to: Vector3; spin: Vector3 }
  | { kind: 'foot' }
  | { kind: 'entrance'; band: number }
  | { kind: 'tunnel' }
  | { kind: 'niche' };

interface Piece {
  part: GizaPart;
  tint: number;
  position: Vector3;
  scale: Vector3;
  rotation: Quaternion;
  role: Role;
}

const X = new Vector3(1, 0, 0);
const Y = new Vector3(0, 1, 0);
const NO_ROTATION = new Quaternion();
/** How far a marker pokes over the band that is rising (m): the next band covers it. */
const POKE = 0.6;
/** The east half is withdrawn toward the viewer's side: it slides this far (m) while it shrinks around its center. */
const RETIRE = { slide: 60, center: new Vector3(60, 30, 0) } as const;
/** Share of `strip` that a falling stone takes from the top of the face to the ground. */
const FALL_SPAN = 0.45;
const DEBRIS = 64;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
/** How much of band `band` has risen (0..1) for a `courses` value. */
const risen = (state: GizaState, band: number) => smooth(state.courses * PYRAMID.bands - band);
/** The heap of Tura stone that waits beside the east face while the casing is laid (it shrinks as the casing rises). */
const turaPile = (casing: number) => smooth(casing / 0.12) * (1 - smooth((casing - 0.75) / 0.25));

const matrix = new Matrix4();
const position = new Vector3();
const scale = new Vector3();
const quaternion = new Quaternion();
const euler = new Euler();
const color = new Color();
const accent = new Color(COLORS.accent);
const ground = new Color(GIZA_ENV.backdrop);

/** Sheet of haze computed per pixel (no texture: iOS Safari tinted canvas textures with color speckles). */
function createSandMaterial() {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color(COLORS.sand) }, uOpacity: { value: SAND.opacity } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
      void main() {
        float d = min(length(vUv - 0.5) * 2.0, 1.0);
        float falloff = d < 0.55 ? mix(0.9, 0.5, d / 0.55) : mix(0.5, 0.0, (d - 0.55) / 0.45);
        gl_FragColor = vec4(uColor, falloff * uOpacity);
      }`,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
}

/** A dashed line as short segments (no `LineDashedMaterial`: one material for every line). */
function pushDashes(out: number[], from: Vector3, to: Vector3, dash = 2.2, gap = 1.6) {
  const length = from.distanceTo(to);
  const direction = new Vector3().subVectors(to, from).divideScalar(length);
  for (let along = 0; along < length; along += dash + gap) {
    const a = from.clone().addScaledVector(direction, along);
    const b = from.clone().addScaledVector(direction, Math.min(along + dash, length));
    out.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
}

/**
 * The Great Pyramid as a plaster maquette (docs/ART-DIRECTION.md §6): the real silhouette in meters (`gizaConfig`), a handful of draw
 * calls for the whole thing: one instanced mesh of boxes (core bands, markers of the interior, heaps of blocks, falling stones,
 * entrance, tunnel, niches), the casing as one mesh whose bands are shown with `drawRange`, the cut face, the lines and the sand.
 * `setState` places and paints every piece for a story state as a pure function of it.
 *
 * Deviation from the plan: one casing mesh, not two (east and west). The casing is never on screen while the cut is open (`strip` is
 * 1 whenever `section` is above 0), so it does not need to be split at the plane.
 */
export class GreatPyramid implements MonumentModel<GizaState> {
  readonly root = new Group();
  private readonly plaster = createToonPlaster(PLASTER.color, PLASTER.bands);
  private readonly casingPlaster = createToonPlaster(CASING_PLASTER.color, CASING_PLASTER.bands);
  private readonly cutPlaster = createToonPlaster(PLASTER.color, PLASTER.bands);
  private readonly boxGeometry = new BoxGeometry(1, 1, 1);
  private readonly pieces: Piece[] = [];
  private readonly random = createRandom(SEED);
  private boxes!: InstancedMesh;
  private casing!: Mesh<BufferGeometry>;
  private cutFace!: Mesh<BufferGeometry>;
  private lines!: LineSegments<BufferGeometry, LineBasicMaterial>;
  private plateauVertices = 0;
  private sand!: Mesh<PlaneGeometry, ShaderMaterial>;
  private state: GizaState = { ...REST };
  private highlight: GizaPart | null = null;
  private matricesPlaced = false;
  private casingFront = -2;

  private constructor() {
    this.root.name = 'great-pyramid';
    this.root.scale.setScalar(SCALE);
    this.casingPlaster.material.vertexColors = true;
  }

  /** Builds in slices (core and interior, then the loose stones, then the meshes), handing the main thread back between them. */
  static async create() {
    const model = new GreatPyramid();
    model.buildCore();
    model.buildMarkers();
    await yieldToMain();
    model.buildQuarries();
    model.buildDebris();
    model.buildNorthFace();
    model.buildNiches();
    await yieldToMain();
    model.assemble();
    return model;
  }

  // ---------- Building the pieces (real meters) ----------

  private add(role: Role, part: GizaPart, tint: number, at: Vector3, size: Vector3, rotation: Quaternion = NO_ROTATION) {
    this.pieces.push({ part, tint, position: at, scale: size, rotation, role });
  }

  /** A bar from one point of the plane x = `x` to another (a slab leaning on the face, a sloped slab of the interior). */
  private bar(from: Vector3, to: Vector3, width: number, thickness: number) {
    const direction = new Vector3().subVectors(to, from);
    const length = direction.length();
    return {
      at: new Vector3().addVectors(from, to).multiplyScalar(0.5),
      size: new Vector3(width, length, thickness),
      rotation: new Quaternion().setFromUnitVectors(Y, direction.divideScalar(length)),
    };
  }

  /** The core: a box per band, in two halves split at the plane of the cut. Their pose is computed in `placeCore`. */
  private buildCore() {
    for (let band = 0; band < PYRAMID.bands; band++) {
      const halfWidth = coreHalfWidth(band);
      if (halfWidth < 0.5) continue;
      this.add({ kind: 'core', band, side: 'west', halfWidth }, 'core', COLORS.plaster, new Vector3(), new Vector3());
      if (halfWidth > CUT.x) this.add({ kind: 'core', band, side: 'east', halfWidth }, 'core', COLORS.plaster, new Vector3(), new Vector3());
    }
  }

  /** Stones that show where the interior is being laid on the top of the rising trunk (in accent), until the next band covers them. */
  private buildMarkers() {
    const point = interiorPoints();
    const { gallery, queen, king } = point;
    const marker = (part: GizaPart, x: number, z: number, y: number, sx: number, sz: number) => {
      const band = Math.floor(y / BAND_HEIGHT);
      const height = BAND_HEIGHT + POKE;
      this.add({ kind: 'marker', band }, part, COLORS.plaster, new Vector3(x, band * BAND_HEIGHT + height / 2, z), new Vector3(sx, height, sz));
    };
    const alongGallery = (share: number) => gallery.z0 + (gallery.z1 - gallery.z0) * share;
    const galleryY = (z: number) => gallery.y0 + gallery.slope * (z - gallery.z0);
    // Ascending and horizontal passages.
    for (const share of [0.3, 0.7]) {
      const z = point.junction.z + (gallery.z0 - point.junction.z) * share;
      marker('core', CUT.x, z, point.junction.y + gallery.slope * (z - point.junction.z) + point.passage, 3.6, 3);
    }
    for (const z of [queen.z0 - 28, queen.z0 - 10]) marker('core', CUT.x, z, queen.y0 + point.passage, 3.6, 3);
    marker('core', CUT.x, (queen.z0 + queen.z1) / 2, queen.ridge, 5.4, queen.z1 - queen.z0 + 0.8);
    // The Grand Gallery: roof slabs along its ceiling.
    for (let index = 0; index < 7; index++) {
      const z = alongGallery((index + 0.5) / 7);
      marker('gallery', CUT.x, z, galleryY(z) + INTERIOR.gallery.thickness, 4.6, 5.4);
    }
    // The king's chamber: nine granite slabs across the roof, side by side along the 10.5 m.
    const slabWidth = INTERIOR.king.length / 9;
    for (let index = 0; index < 9; index++) {
      marker('kings-chamber', CUT.x - INTERIOR.king.length / 2 + (index + 0.5) * slabWidth, (king.z0 + king.z1) / 2, king.roof, slabWidth - 0.05, king.z1 - king.z0 + 2);
    }
    // The five ceilings of the relieving chambers.
    const { relief } = INTERIOR;
    for (let index = 0; index < 5; index++) {
      marker('kings-chamber', CUT.x, (point.relief.z0 + point.relief.z1) / 2, point.relief.firstFloor + index * (relief.height + relief.slab) + relief.height, 11.6, point.relief.z1 - point.relief.z0 + 1.2);
    }
  }

  /** Three heaps of blocks on the pedestal: limestone of the plateau, Aswan granite, white limestone of Tura (the one beside the east face). */
  private buildQuarries() {
    const heaps = [
      { cx: -62, cz: -34, size: [7, 5.5, 6], nx: 3, nz: 3, layers: 2, tint: COLORS.plaster },
      { cx: -58, cz: 52, size: [13, 3.6, 3.6], nx: 2, nz: 4, layers: 2, tint: COLORS.stoneDark },
      { cx: 131, cz: 20, size: [5.2, 1.6, 3.2], nx: 3, nz: 3, layers: 4, tint: COLORS.plaster },
    ] as const;
    heaps.forEach((heap, group) => {
      const [sx, sy, sz] = heap.size;
      const spots: Vector3[] = [];
      for (let layer = 0; layer < heap.layers; layer++) {
        for (let i = 0; i < heap.nx; i++) {
          for (let j = 0; j < heap.nz; j++) {
            if (layer > 0 && this.random() < 0.3) continue;
            const jitter = () => (this.random() - 0.5) * 0.6;
            spots.push(new Vector3(heap.cx + (i - (heap.nx - 1) / 2) * sx * 1.1 + jitter(), layer * sy + sy / 2, heap.cz + (j - (heap.nz - 1) / 2) * sz * 1.1 + jitter()));
          }
        }
      }
      spots.forEach((spot, order) => this.add({ kind: 'quarry', group, order, count: spots.length }, 'core', heap.tint, spot, new Vector3(sx, sy, sz)));
    });
  }

  /** Casing stones that fall from the face and fade out: from a point of the slope at some height to the ground around the base. */
  private buildDebris() {
    const rnd = this.random;
    for (let index = 0; index < DEBRIS; index++) {
      const height = 18 + rnd() * (PYRAMID.height - 30);
      const half = casingHalfWidth(height);
      const along = (rnd() * 2 - 1) * 0.85;
      const reach = casingHalfWidth(0) + 3 + rnd() * 20;
      // Faces 0 and 1 are north and south, 2 and 3 west and east.
      const face = Math.floor(rnd() * 4);
      const side = face % 2 === 0 ? -1 : 1;
      const onZ = face < 2;
      const from = onZ ? new Vector3(along * half, height, side * half) : new Vector3(side * half, height, along * half);
      const to = onZ ? new Vector3(along * reach * 0.9, 1.6, side * reach) : new Vector3(side * reach, 1.6, along * reach * 0.9);
      const size = 2.5 + rnd() * 3;
      this.add(
        { kind: 'debris', delay: 0.5 * (1 - height / PYRAMID.height), from, to, spin: new Vector3(rnd() * 5, rnd() * 5, rnd() * 5) },
        'casing',
        COLORS.plaster,
        from.clone(),
        new Vector3(size, size * 0.6, size * 0.8),
      );
    }
  }

  /** What stands on the north face: the casing stones that are left at its foot, the chevrons of the entrance and the robbers' tunnel. */
  private buildNorthFace() {
    const { slope, halfBase } = PYRAMID;
    // Casing stones lying on the slope: a row of 1.5 m courses; some are missing.
    const length = 1.5;
    const thickness = 1.2;
    const lean = new Quaternion().setFromAxisAngle(X, Math.PI / 2 - slope);
    const rows = [
      [0, 1, 2, 4, 5, 6, 8],
      [1, 2, 4, 5, 7],
    ];
    rows.forEach((row, rowIndex) => {
      const along = rowIndex * length + length / 2;
      for (const index of row) {
        const inward = thickness / 2 + 0.1;
        const at = new Vector3(-48 + index * 12, along * Math.sin(slope) - inward * Math.cos(slope), -halfBase + along * Math.cos(slope) + inward * Math.sin(slope));
        this.add({ kind: 'foot' }, 'casing', COLORS.plaster, at, new Vector3(10.5, length, thickness), lean);
      }
    });

    // The entrance: two slabs leaning against each other above the passage (chevron).
    const { entryZ, entryY } = INTERIOR.descent;
    for (const [fromZ, toZ] of [
      [entryZ - 0.3, entryZ + 1.8],
      [entryZ + 3.9, entryZ + 1.8],
    ]) {
      const slab = this.bar(new Vector3(CUT.x, entryY - 0.9, fromZ), new Vector3(CUT.x, entryY + 2, toZ), 5, 0.9);
      this.add({ kind: 'entrance', band: Math.floor((entryY + 2) / BAND_HEIGHT) }, 'entrance', COLORS.plaster, slab.at, slab.size, slab.rotation);
    }

    // The robbers' tunnel: a frame that reaches from the core to the line of the casing (two jambs and a lintel).
    const tunnel = (x: number, y: number, sx: number, sy: number) => this.add({ kind: 'tunnel' }, 'tunnel', COLORS.plaster, new Vector3(x, y, -108.1), new Vector3(sx, sy, 2.2));
    tunnel(-10, 7.25, 1, 2.7);
    tunnel(-7, 7.25, 1, 2.7);
    tunnel(-8.5, 9.1, 4, 1);
  }

  /** The backs of the gallery and of the king's chamber: thin slabs just in front of the bottom of their niche, so they can be picked and tinted on their own. */
  private buildNiches() {
    const { gallery, king } = interiorPoints();
    const x = CUT.x - CUT.depth + 0.17;
    const angle = Math.atan(gallery.slope);
    const length = (gallery.z1 - gallery.z0) / Math.cos(angle);
    this.add(
      { kind: 'niche' },
      'gallery',
      COLORS.stoneDark,
      new Vector3(x, (gallery.y0 + gallery.y1) / 2 + INTERIOR.gallery.thickness / 2, (gallery.z0 + gallery.z1) / 2),
      new Vector3(0.1, INTERIOR.gallery.thickness * Math.cos(angle), length),
      new Quaternion().setFromAxisAngle(X, -angle),
    );
    this.add({ kind: 'niche' }, 'kings-chamber', COLORS.stoneDark, new Vector3(x, (king.floor + king.roof) / 2, (king.z0 + king.z1) / 2), new Vector3(0.1, king.roof - king.floor, king.z1 - king.z0));
  }

  private assemble() {
    this.boxes = new InstancedMesh(this.boxGeometry, this.plaster.material, this.pieces.length);
    this.boxes.name = 'giza-boxes';
    this.boxes.castShadow = true;
    this.boxes.receiveShadow = true;
    this.boxes.frustumCulled = false;
    // Fixed bounds (picking tests the sphere first).
    this.boxes.boundingSphere = new Sphere(new Vector3(0, 70, 0), PYRAMID.halfBase * 1.8);
    this.boxes.setColorAt(0, new Color(1, 1, 1));

    this.casing = new Mesh(createCasingGeometry(), this.casingPlaster.material);
    this.casing.name = 'giza-casing';
    this.cutFace = new Mesh(createCutFaceGeometry(), this.cutPlaster.material);
    this.cutFace.name = 'giza-cut-face';
    for (const mesh of [this.casing, this.cutFace]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
    }

    this.root.add(this.boxes, this.casing, this.cutFace);
    this.buildLines();
    this.buildSand();
    this.setState(REST);
  }

  /** The square of the base with its four cardinal marks, and the dashed outlines of the Big Void and of the north corridor (drawing, not surface: out of the ink pass). */
  private buildLines() {
    const b = PYRAMID.halfBase;
    const y = 0.3;
    const points: number[] = [];
    const segment = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => points.push(ax, ay, az, bx, by, bz);
    segment(-b, y, -b, b, y, -b);
    segment(b, y, -b, b, y, b);
    segment(b, y, b, -b, y, b);
    segment(-b, y, b, -b, y, -b);
    // Cardinal marks: a tick out of the middle of each side; the north one is longer, with an arrow head.
    segment(0, y, -b, 0, y, -b - 26);
    segment(0, y, -b - 26, -3, y, -b - 19);
    segment(0, y, -b - 26, 3, y, -b - 19);
    segment(0, y, b, 0, y, b + 12);
    segment(b, y, 0, b + 12, y, 0);
    segment(-b, y, 0, -b - 12, y, 0);
    this.plateauVertices = points.length / 3;

    // The outlines go a little in front of the cut face.
    const x = CUT.x + 0.25;
    const { gallery } = interiorPoints();
    const { voidSpace, northCorridor } = INTERIOR;
    const floor = (z: number) => gallery.y0 + gallery.slope * (z - gallery.z0) + INTERIOR.gallery.thickness + voidSpace.above;
    const outline = (corners: [number, number][]) =>
      corners.forEach(([z, height], index) => {
        const [nextZ, nextHeight] = corners[(index + 1) % corners.length];
        pushDashes(points, new Vector3(x, height, z), new Vector3(x, nextHeight, nextZ));
      });
    outline([
      [voidSpace.from, floor(voidSpace.from)],
      [voidSpace.to, floor(voidSpace.to)],
      [voidSpace.to, floor(voidSpace.to) + voidSpace.thickness],
      [voidSpace.from, floor(voidSpace.from) + voidSpace.thickness],
    ]);
    outline([
      [northCorridor.z[0], northCorridor.y[0]],
      [northCorridor.z[1], northCorridor.y[0]],
      [northCorridor.z[1], northCorridor.y[1]],
      [northCorridor.z[0], northCorridor.y[1]],
    ]);

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
    const rgba: number[] = [];
    const [r, g, b2] = accent.toArray();
    for (let index = 0; index < points.length / 3; index++) rgba.push(r, g, b2, 0);
    geometry.setAttribute('color', new Float32BufferAttribute(rgba, 4));
    this.lines = new LineSegments(geometry, new LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
    this.lines.name = 'giza-lines';
    this.lines.layers.set(SKY_LAYER);
    this.lines.frustumCulled = false;
    this.root.add(this.lines);
  }

  private buildSand() {
    this.sand = new Mesh(new PlaneGeometry(SAND.size[0], SAND.size[1]).rotateX(-Math.PI / 2), createSandMaterial());
    this.sand.position.y = SAND.y;
    this.sand.layers.set(SKY_LAYER);
    this.sand.frustumCulled = false;
    this.root.add(this.sand);
  }

  // ---------- State ----------

  /** Sets the pose of the shared scratch objects for a piece. Returns true when the piece is in accent (what the story is changing right now). */
  private place(piece: Piece, state: GizaState, open: boolean): boolean {
    position.copy(piece.position);
    scale.copy(piece.scale);
    quaternion.copy(piece.rotation);
    const { role } = piece;
    switch (role.kind) {
      case 'core': {
        const lost = role.band >= BANDS_TODAY ? smooth(state.strip / 0.2) : 0;
        const grown = risen(state, role.band) * (1 - lost);
        const { halfWidth } = role;
        const west = role.side === 'west';
        const from = west ? -halfWidth : CUT.x;
        // Where the cut is open the half that stays ends one slab before the plane (the slab is the cut face).
        const to = west ? (halfWidth <= CUT.x ? halfWidth : CUT.x - (open ? CUT.depth : 0)) : halfWidth;
        position.set((from + to) / 2, role.band * BAND_HEIGHT + (grown * BAND_HEIGHT) / 2, 0);
        scale.set(to - from, grown * BAND_HEIGHT, 2 * halfWidth);
        if (!west && state.section > 0) {
          const shrink = 1 - smooth((state.section - 0.1) / 0.65);
          position.sub(RETIRE.center).multiplyScalar(shrink).add(RETIRE.center);
          position.x += RETIRE.slide * state.section;
          scale.multiplyScalar(shrink);
        }
        return grown > 0 && grown < 1;
      }
      case 'marker': {
        const grown = state.courses >= 0.995 ? 0 : risen(state, role.band);
        position.y = piece.position.y - piece.scale.y / 2 + (grown * piece.scale.y) / 2;
        scale.y *= grown;
        return grown > 0 && (grown < 1 || risen(state, role.band + 1) < 0.3);
      }
      case 'quarry': {
        const window = (state.quarries - role.group / 3) * 3;
        let arrived = smooth((window - (0.6 * role.order) / role.count) / 0.4);
        if (role.group === 2) arrived = Math.max(arrived, turaPile(state.casing));
        position.y += (1 - arrived) * 30;
        scale.multiplyScalar(arrived);
        return arrived > 0 && arrived < 1;
      }
      case 'debris': {
        const t = clamp01((state.strip - role.delay) / FALL_SPAN);
        position.lerpVectors(role.from, role.to, t);
        position.y = role.from.y + (role.to.y - role.from.y) * t * t;
        quaternion.setFromEuler(euler.set(role.spin.x * t, role.spin.y * t, role.spin.z * t));
        scale.multiplyScalar(smooth(t / 0.1) * (1 - smooth((t - 0.7) / 0.3)));
        return true;
      }
      case 'foot':
        scale.multiplyScalar(smooth(state.casing / 0.04));
        return false;
      case 'entrance': {
        // The chevrons stand behind the casing: hidden while the casing covers their band.
        const covered = Math.min(state.casing, 1 - state.strip) * PYRAMID.bands > role.band;
        scale.multiplyScalar(open || covered ? 0 : risen(state, role.band));
        return false;
      }
      case 'tunnel': {
        scale.multiplyScalar(smooth(state.tunnel));
        return state.tunnel > 0 && state.strip < 0.98;
      }
      case 'niche':
        scale.multiplyScalar(open ? 1 : 0);
        return false;
    }
  }

  /** Places and paints every piece for a story state. Call it on the frames where the state moves. */
  setState(state: GizaState) {
    const open = state.section > 0.001;
    const shapeMoved =
      !this.matricesPlaced || (['quarries', 'courses', 'casing', 'strip', 'tunnel', 'section'] as const).some((key) => state[key] !== this.state[key]);
    this.matricesPlaced = true;
    Object.assign(this.state, state);

    this.pieces.forEach((piece, index) => {
      const moving = this.place(piece, state, open);
      // A box flat on one axis would draw a sheet with NaN normals (black in the AO and ink passes): hide it whole.
      if (scale.x * scale.y * scale.z === 0) scale.setScalar(0);
      if (shapeMoved) {
        matrix.compose(position, quaternion, scale);
        this.boxes.setMatrixAt(index, matrix);
      }
      color.setHex(moving ? COLORS.accent : piece.tint);
      // In Explore the chosen part goes to the accent and the rest sinks toward the ground.
      if (this.highlight) applyExploreFocus(color, piece.part === this.highlight, accent, ground);
      this.boxes.setColorAt(index, color);
    });
    if (shapeMoved) this.boxes.instanceMatrix.needsUpdate = true;
    if (this.boxes.instanceColor) this.boxes.instanceColor.needsUpdate = true;

    // Casing: bands from the base up, as many as it has risen and the fall from the top has left.
    const bands = PYRAMID.bands;
    const shown = Math.max(0, Math.min(bands, Math.ceil(Math.min(state.casing, 1 - state.strip) * bands - 1e-6)));
    this.casing.geometry.setDrawRange(0, shown * CASING_INDICES_PER_BAND);
    this.casing.visible = shown > 0;
    // The front (the band that is being laid or that is about to fall) is in accent.
    const front = shown > 0 && (state.casing < 0.999 || state.strip > 0.001) ? shown - 1 : -1;
    if (front !== this.casingFront) {
      const colors = this.casing.geometry.getAttribute('color') as BufferAttribute;
      colors.array.fill(1);
      if (front >= 0) {
        const start = front * CASING_VERTICES_PER_BAND;
        for (let vertex = start; vertex < start + CASING_VERTICES_PER_BAND; vertex++) accent.toArray(colors.array as Float32Array, vertex * 3);
      }
      colors.needsUpdate = true;
      this.casingFront = front;
    }
    this.tintMaterial(this.casingPlaster.material.color, CASING_PLASTER.color, 'casing');
    this.cutFace.visible = open;
    this.tintMaterial(this.cutPlaster.material.color, PLASTER.color, 'core');

    this.paintLines(state);
    // false = only colors changed (the story skips the shadow refresh).
    return shapeMoved;
  }

  private tintMaterial(target: Color, base: number, part: GizaPart) {
    target.setHex(base);
    if (this.highlight) applyExploreFocus(target, this.highlight === part, accent, ground);
  }

  private paintLines(state: GizaState) {
    const alpha = this.lines.geometry.getAttribute('color') as BufferAttribute;
    const voidAlpha = this.highlight === 'void' ? 1 : state.void;
    for (let vertex = 0; vertex < alpha.count; vertex++) alpha.setW(vertex, vertex < this.plateauVertices ? state.plateau : voidAlpha);
    alpha.needsUpdate = true;
    this.lines.visible = state.plateau > 0.01 || voidAlpha > 0.01;
  }

  setHighlight(part: string | null) {
    this.highlight = part as GizaPart | null;
  }

  /** The part under the ray: the casing, the cut face and the boxes (the lines and the sand are looked through). */
  pick(raycaster: Raycaster): string | null {
    const hits = raycaster.intersectObjects([this.boxes, this.casing, this.cutFace], false);
    for (const hit of hits) {
      if (!hit.object.visible) continue;
      if (hit.object === this.boxes) return hit.instanceId === undefined ? null : this.pieces[hit.instanceId].part;
      return hit.object === this.casing ? 'casing' : 'core';
    }
    return null;
  }

  get current(): GizaState {
    return this.state;
  }

  dispose() {
    this.boxes.dispose();
    this.boxGeometry.dispose();
    this.casing.geometry.dispose();
    this.cutFace.geometry.dispose();
    this.lines.geometry.dispose();
    this.lines.material.dispose();
    this.sand.geometry.dispose();
    this.sand.material.dispose();
    this.plaster.dispose();
    this.casingPlaster.dispose();
    this.cutPlaster.dispose();
    this.root.removeFromParent();
  }
}
