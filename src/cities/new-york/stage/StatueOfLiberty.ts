import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PointLight,
  Quaternion,
  ShaderMaterial,
  Shape,
  SphereGeometry,
  Sphere,
  Vector2,
  Vector3,
  type Material,
  type Raycaster,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { SKY_LAYER } from '../../../engine/render/LookPipeline';
import { yieldToMain } from '../../../engine/utils/yieldToMain';
import { applyExploreFocus, createToonPlaster, type MonumentModel } from '../../../engine/stages/shared/monument';
import { CUT_FACING, figureBaseY, riseY } from './libertyStates';
import { dropAbove, flattenScene, PART_NAMES, sliceStraight, splitIntoCells, type CellGroup, type FigureCells, type FlatFigure } from './libertyFigure';
import {
  ACCENT,
  BASE_Y,
  EXPLODE_LIFT,
  FIGURE,
  LAYER_ORDER,
  LIBERTY_MODEL,
  MIST,
  NECK_Y,
  NEW_YORK_ENV,
  PEDESTAL_PIECES,
  PLASTER,
  REST,
  SKIN_COLOR,
  SKIN_CUTS,
  TINT,
  TORCH,
  type Layer,
  type LibertyState,
} from './newYorkConfig';

/** The parts that have a card in the Explore chapter (ids of the cards in src/cities/new-york/story.ts). */
export type LibertyPart = 'torch' | 'crown' | 'tablet' | 'skin' | 'pylon' | 'pedestal' | 'fort';

/** A rigid piece of the skeleton (an instance of the unit box). */
interface IronPiece {
  position: Vector3;
  quaternion: Quaternion;
  scale: Vector3;
  layer: Layer;
}

const UP = new Vector3(0, 1, 0);
const TAU = Math.PI * 2;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (from: number, to: number, value: number) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};

/** Where the layers leave the figure: the upper ones first, and they come back last. */
function layerExplode(layer: Layer, explode: number) {
  const index = LAYER_ORDER.indexOf(layer);
  if (index < 0) return 0;
  const from = (1 - index / (LAYER_ORDER.length - 1)) * 0.5;
  return smooth(from, from + 0.5, explode);
}

/** Height of the emissive flame (the sculpted one it replaces was ~2.4 m), and how deep its foot sits in the cup. */
const FLAME_HEIGHT = 2.4;
const FLAME_SINK = 0.3;

/** Loads the sculpted figure (meshopt-compressed GLB). Nothing is written anywhere but the returned arrays, so a stale load cannot touch a newer one. */
async function loadFigure(): Promise<FlatFigure> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(FIGURE.url);
  const flat = sliceStraight(dropAbove(flattenScene(gltf.scene), FIGURE.flameFrom), FIGURE.cuts);
  gltf.scene.traverse((object) => (object as Mesh).geometry?.dispose());
  return flat;
}

// ---------- Scratch ----------

const matrix = new Matrix4();
const position = new Vector3();
const scale = new Vector3();
const unitRotation = new Quaternion();
const accent = new Color(ACCENT);
const copperColor = new Color(SKIN_COLOR.copper);
const patinaColor = new Color(1, 1, 1).lerp(accent, SKIN_COLOR.patinaTint);
const stoneColor = new Color();
const tone = new Color();
const fortTint = new Color(TINT.stoneMid);
const ground = new Color(NEW_YORK_ENV.backdrop);
/** Explore focus: the figure already wears the accent (her green), so a lighter green read as her own color; the chosen part takes the torch gold. */
const focusAccent = new Color(TORCH.flame);

/** Soft round glow computed per pixel, on a sphere so it reads from every side (no texture: iOS tints canvas textures). */
function createGlowMaterial() {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color(TORCH.glow) }, uOpacity: { value: 0 } },
    vertexShader: 'varying vec3 vNormalView; void main() { vNormalView = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity; varying vec3 vNormalView;
      void main() { gl_FragColor = vec4(uColor, pow(max(vNormalView.z, 0.0), 2.2) * uOpacity); }`,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
}

/** Soft round sheet of haze, computed per pixel (same recipe as the mist of Rome). */
function createMistMaterial(opacity: number) {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color(MIST.color) }, uOpacity: { value: opacity } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
      void main() {
        float d = min(length(vUv - 0.5) * 2.0, 1.0);
        float falloff = d < 0.5 ? mix(0.9, 0.45, d * 2.0) : mix(0.45, 0.0, (d - 0.5) * 2.0);
        gl_FragColor = vec4(uColor, falloff * uOpacity);
      }`,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
}

/** Fort Wood: the 11-pointed star, with a worn edge. */
function createFortGeometry() {
  const { points, outer, inner, height } = LIBERTY_MODEL.fort;
  const shape = new Shape();
  for (let index = 0; index < points * 2; index++) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = (index / (points * 2)) * TAU - Math.PI / 2;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const bevel = 0.6;
  const geometry = new ExtrudeGeometry(shape, { depth: height - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: 0.8, bevelSegments: 1, steps: 1 });
  // Extruded along z: lay it down so it grows up, from the ground to `height`.
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, bevel, 0);
  return geometry;
}

/**
 * The Statue of Liberty as a plaster maquette (docs/ART-DIRECTION.md §6, docs/briefs/new-york.md §4): Fort Wood, Hunt's pedestal,
 * the sculpted figure (GLB, same plaster and ink as everything else) cut into cells whose vertices `setState` moves and colors (the
 * skin is cut in section, the layers part, the green runs up), Eiffel's skeleton, the flame and the haze. About eight draw calls.
 * `setState` places everything for a story state as a pure function of it.
 */
export class StatueOfLiberty implements MonumentModel<LibertyState> {
  readonly root = new Group();
  private readonly plaster = createToonPlaster(PLASTER.color, PLASTER.bands);
  private readonly skinPlaster = createToonPlaster(PLASTER.color, PLASTER.bands);
  private readonly fortMaterial = this.plaster.material.clone();
  private readonly iron: IronPiece[] = [];
  private readonly mist: Mesh<PlaneGeometry, ShaderMaterial>[] = [];
  private fort!: Mesh<BufferGeometry, Material>;
  private stoneMesh!: InstancedMesh;
  private ironMesh!: InstancedMesh;
  private skinMesh!: Mesh<BufferGeometry, Material>;
  private flame!: Mesh<LatheGeometry, MeshBasicMaterial>;
  private glow!: Mesh<SphereGeometry, ShaderMaterial>;
  private readonly light = new PointLight(TORCH.light.color, 0, TORCH.light.distance, 2);
  private readonly basePositions: Float32Array;
  private readonly groups: readonly CellGroup[];
  private readonly vertexGroup: Uint16Array;
  private readonly vertexPart: Uint8Array;
  private readonly tip: readonly [number, number, number];
  /** Foot of the flame: the centre of the cup. */
  private readonly flameBase = new Vector3();
  private readonly groupOffsets: Float32Array;
  private readonly lastOffsets: Float32Array;
  private readonly cells: FigureCells;
  private readonly flat: FlatFigure;
  private state: LibertyState = { ...REST };
  private highlight: LibertyPart | null = null;
  private paintKey = '';
  private lastSweep = Number.NaN;

  private constructor(flat: FlatFigure, cells: FigureCells) {
    this.root.name = 'statue-of-liberty';
    this.flat = flat;
    this.cells = cells;
    this.basePositions = flat.positions;
    this.groups = cells.groups;
    this.vertexGroup = cells.vertexGroup;
    this.vertexPart = cells.vertexPart;
    this.tip = cells.tip;
    // The tip is the rim of the cup (the sculpted flame is dropped): the flame stands upright on the centre of its top half meter.
    let near = 0;
    for (let at = 0; at < flat.positions.length; at += 3) {
      if (this.tip[1] - flat.positions[at + 1] > 0.5) continue;
      this.flameBase.x += flat.positions[at];
      this.flameBase.z += flat.positions[at + 2];
      near++;
    }
    this.flameBase.divideScalar(near);
    this.flameBase.y = this.tip[1] - FLAME_SINK;
    this.groupOffsets = new Float32Array(cells.groups.length * 3);
    this.lastOffsets = new Float32Array(cells.groups.length * 3).fill(Number.NaN);
  }

  /** Builds in slices (the figure from the file, the cells, fort and skeleton, then meshes), handing the main thread back between them. */
  static async create() {
    const flat = await loadFigure();
    await yieldToMain();
    const model = new StatueOfLiberty(flat, splitIntoCells(flat, { ...FIGURE.cuts, facing: CUT_FACING }));
    await yieldToMain();
    model.buildFort();
    model.buildSkeleton();
    await yieldToMain();
    model.assemble();
    return model;
  }

  // ---------- Building the pieces ----------

  private buildFort() {
    this.fort = new Mesh(createFortGeometry(), this.fortMaterial);
    this.fort.name = 'fort-wood';
    this.fort.castShadow = true;
    this.fort.receiveShadow = true;
  }

  private addBar(from: Vector3, to: Vector3, thickness: number, layer: Layer, flat = 1) {
    const direction = new Vector3().subVectors(to, from);
    const length = direction.length();
    if (length < 0.2) return;
    this.iron.push({
      position: new Vector3().addVectors(from, to).multiplyScalar(0.5),
      quaternion: new Quaternion().setFromUnitVectors(UP, direction.divideScalar(length)),
      scale: new Vector3(thickness, length, thickness * flat),
      layer,
    });
  }

  /** Eiffel's pylon (four posts, an X per face and a belt per bay) and the flat bars of the armature that reach the skin; sized to the body of the figure. */
  private buildSkeleton() {
    const bays = SKIN_CUTS.rings;
    const corners: readonly [number, number][] = [
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ];
    const half = (y: number) => 0.4 * this.cells.radiusAt(y);
    // Never past 70 % of the skin in that direction: she is not round, and where she is narrow (legs, neck) the iron showed through.
    const post = (y: number, [sx, sz]: readonly [number, number]) => {
      // Up to the knees she is two legs with a gap between them: the bars there cross it unless the pylon is tighter.
      const share = y < 8 ? 0.45 : 0.7;
      const h = Math.min(half(y), (share * this.cells.insideAt(y, Math.atan2(sz, sx))) / Math.SQRT2);
      return new Vector3(sx * h, y, sz * h);
    };

    for (let bay = 0; bay < bays; bay++) {
      const y0 = (NECK_Y * bay) / bays;
      const y1 = (NECK_Y * (bay + 1)) / bays;
      corners.forEach((corner, index) => {
        const next = corners[(index + 1) % corners.length];
        this.addBar(post(y0, corner), post(y1, corner), 0.7, 'iron');
        this.addBar(post(y0, corner), post(y1, next), 0.38, 'iron');
        this.addBar(post(y0, next), post(y1, corner), 0.38, 'iron');
        this.addBar(post(y1, corner), post(y1, next), 0.45, 'iron');
        if (bay === 0) this.addBar(post(y0, corner), post(y0, next), 0.45, 'iron');
      });
    }

    // Armature: flat bars from the pylon out to the skin, eight at each ring boundary.
    for (let level = 1; level < bays; level++) {
      const y = (NECK_Y * level) / bays;
      for (let spoke = 0; spoke < 8; spoke++) {
        const angle = ((spoke + 0.5) / 8) * TAU;
        const outer = Math.min(this.cells.radiusAt(y) * 0.85, this.cells.insideAt(y, angle) * 0.85);
        const inner = Math.min(half(y) * 0.8, outer * 0.5);
        this.addBar(new Vector3(inner * Math.cos(angle), y, inner * Math.sin(angle)), new Vector3(outer * Math.cos(angle), y, outer * Math.sin(angle)), 0.22, 'iron', 3);
      }
    }
  }

  private assemble() {
    const bounds = new Sphere(new Vector3(0, 80, 0), 220);
    const box = new BoxGeometry(1, 1, 1);

    this.fort.geometry.computeBoundingSphere();

    this.stoneMesh = new InstancedMesh(box, this.plaster.material, PEDESTAL_PIECES.length);
    this.stoneMesh.name = 'hunt-pedestal';
    this.stoneMesh.castShadow = true;
    this.stoneMesh.receiveShadow = true;
    this.stoneMesh.frustumCulled = false;
    this.stoneMesh.boundingSphere = bounds.clone();
    this.stoneMesh.setColorAt(0, stoneColor.set(TINT.stoneMid));

    this.ironMesh = new InstancedMesh(box, this.plaster.material, this.iron.length);
    this.ironMesh.name = 'eiffel-skeleton';
    this.ironMesh.castShadow = true;
    this.ironMesh.receiveShadow = true;
    this.ironMesh.frustumCulled = false;
    this.ironMesh.boundingSphere = bounds.clone();
    this.ironMesh.setColorAt(0, stoneColor.set(TINT.iron));

    // The statue: one geometry whose positions and colors `setState` rewrites.
    const geometry = new BufferGeometry();
    const positions = new BufferAttribute(new Float32Array(this.flat.positions), 3);
    positions.setUsage(DynamicDrawUsage);
    const colors = new BufferAttribute(new Float32Array(this.flat.positions.length).fill(1), 3);
    colors.setUsage(DynamicDrawUsage);
    geometry.setAttribute('position', positions);
    geometry.setAttribute('normal', new Float32BufferAttribute(this.flat.normals, 3));
    geometry.setAttribute('color', colors);
    // Fixed bounds: the exploded view reaches far above the rest pose, and picking tests the sphere first.
    geometry.boundingSphere = bounds.clone();
    this.skinPlaster.material.vertexColors = true;
    this.skinPlaster.material.side = DoubleSide;
    this.skinMesh = new Mesh(geometry, this.skinPlaster.material);
    this.skinMesh.name = 'liberty-figure';
    this.skinMesh.castShadow = true;
    this.skinMesh.receiveShadow = true;
    this.skinMesh.frustumCulled = false;

    // The flame (emissive, out of the ink pass) inside the tip of the sculpted torch, its glow and its light.
    this.flame = new Mesh(
      new LatheGeometry(
        [[0, 0], [0.8, 0.12], [0.95, 0.6], [0.7, 1.4], [0.3, 2], [0, 2.4]].map(([r, y]) => new Vector2(r, (y / 2.4) * FLAME_HEIGHT)),
        16,
      ),
      new MeshBasicMaterial({ color: TORCH.flame, toneMapped: false, fog: false, side: DoubleSide }),
    );
    this.flame.name = 'torch-flame';
    this.flame.layers.set(SKY_LAYER);
    this.flame.frustumCulled = false;
    this.glow = new Mesh(new SphereGeometry(1, 16, 12), createGlowMaterial());
    this.glow.layers.set(SKY_LAYER);
    this.glow.frustumCulled = false;

    // Salt haze at ground level: air, not shapes (out of the ink pass).
    for (const sheet of [MIST.low, MIST.high]) {
      const mesh = new Mesh(new PlaneGeometry(sheet.size, sheet.size).rotateX(-Math.PI / 2), createMistMaterial(sheet.opacity));
      mesh.position.y = BASE_Y + sheet.y;
      mesh.layers.set(SKY_LAYER);
      mesh.frustumCulled = false;
      this.mist.push(mesh);
    }

    this.root.add(this.fort, this.stoneMesh, this.skinMesh, this.ironMesh, this.flame, this.glow, this.light, ...this.mist);
    this.setState(REST);
  }

  // ---------- State ----------

  /** The color of the skin at height `y` (from the heel): new copper, today's verdigris plaster, and the accent at the front that crosses her. */
  private skinTone(y: number, part: number, out: Color) {
    const { copper } = this.state;
    if (copper >= 0.999) out.copy(copperColor);
    else if (copper <= 0.001) out.copy(patinaColor);
    else {
      const { band, soft } = SKIN_COLOR;
      // The patina rises from the hem: `behind` is how far below the front this point sits.
      const behind = (1 - copper) * (LIBERTY_MODEL.torchTop + band) - y;
      // The accent fades in as the change starts and out as it ends, so it never pops.
      const presence = Math.min(1, (1 - copper) * 10, copper * 10);
      if (behind >= band) out.copy(patinaColor);
      else if (behind >= 0) out.copy(patinaColor).lerp(accent, presence * (1 - behind / band) ** 1.4);
      else if (behind > -soft) out.copy(copperColor).lerp(accent, presence * (1 + behind / soft));
      else out.copy(copperColor);
    }
    // With a card open the rest sinks toward the ground; the card of the skin chooses the whole figure, the others their region.
    if (this.highlight) applyExploreFocus(out, this.highlight === 'skin' || this.highlight === PART_NAMES[part], focusAccent, ground);
    return out;
  }

  /** Places and colors every piece for a story state. Call it on the frames where the state moves. */
  setState(state: LibertyState) {
    this.state = { ...state };
    const { skin, explode, pedestal, torch } = state;
    const baseY = figureBaseY(pedestal);
    const lift = {} as Record<Layer, number>;
    for (const layer of LAYER_ORDER) lift[layer] = EXPLODE_LIFT[layer] * layerExplode(layer, explode);
    lift.iron = 0;

    this.placeStone(pedestal);
    this.placeIron(skin, explode, baseY, lift);
    this.placeStatue(skin, baseY, lift);
    this.placeTorch(torch, baseY + lift.torch);
    this.fortMaterial.color.set(PLASTER.color).multiply(fortTint);
    if (this.highlight) applyExploreFocus(this.fortMaterial.color, this.highlight === 'fort', focusAccent, ground);
  }

  private placeStone(pedestal: number) {
    this.stoneMesh.visible = pedestal > 0.001;
    // The pedestal rises over the fort: accent while it moves, stone when it stands.
    const moving = 0.55 * Math.sin(Math.PI * pedestal);
    PEDESTAL_PIECES.forEach((piece, index) => {
      const y0 = riseY(piece.y0, pedestal);
      const y1 = riseY(piece.y1, pedestal);
      position.set(piece.x, (y0 + y1) / 2, piece.z);
      scale.set(piece.w, Math.max(y1 - y0, 1e-4), piece.d);
      matrix.compose(position, unitRotation, scale);
      this.stoneMesh.setMatrixAt(index, matrix);
      stoneColor.set(piece.tint).lerp(accent, moving);
      if (this.highlight) applyExploreFocus(stoneColor, this.highlight === 'pedestal', focusAccent, ground);
      this.stoneMesh.setColorAt(index, stoneColor);
    });
    this.stoneMesh.instanceMatrix.needsUpdate = true;
    if (this.stoneMesh.instanceColor) this.stoneMesh.instanceColor.needsUpdate = true;
  }

  private placeIron(skin: number, explode: number, baseY: number, lift: Record<Layer, number>) {
    // The skeleton shows only through the section of chapter 1; between the parted layers it read as a bare iron tower.
    this.ironMesh.visible = skin > 0.01;
    stoneColor.set(TINT.iron).lerp(accent, 0.55 * smooth(0, 0.5, skin));
    if (this.highlight) applyExploreFocus(stoneColor, this.highlight === 'pylon', focusAccent, ground);
    this.iron.forEach((piece, index) => {
      position.copy(piece.position);
      position.y += baseY + lift[piece.layer];
      matrix.compose(position, piece.quaternion, piece.scale);
      this.ironMesh.setMatrixAt(index, matrix);
      this.ironMesh.setColorAt(index, stoneColor);
    });
    this.ironMesh.instanceMatrix.needsUpdate = true;
    if (this.ironMesh.instanceColor) this.ironMesh.instanceColor.needsUpdate = true;
  }

  /**
   * Moves every vertex of the figure by the offset of its layer (exploded view) and applies the section: triangles whose centroid is
   * past the sweeping plane collapse to a point (zero area), so the ink, the shadow and the G-buffer pass skip them with no clipping
   * planes. Whole triangles go or stay: the edge is stable and no half-open sheet is ever left.
   */
  private placeStatue(skin: number, baseY: number, lift: Record<Layer, number>) {
    const offsets = this.groupOffsets;
    let moved = false;
    this.groups.forEach((group, index) => {
      offsets[index * 3 + 1] = baseY + lift[group.layer as Layer];
      if (offsets[index * 3 + 1] !== this.lastOffsets[index * 3 + 1]) moved = true;
    });
    // The plane comes from the front (`reach`) to the axis (0).
    const sweep = this.cells.reach * (1 - skin);
    if (sweep !== this.lastSweep) moved = true;

    const geometry = this.skinMesh.geometry;
    const base = this.basePositions;
    const count = this.vertexGroup.length;
    // Skips the ~60k vertices when nothing moved (a change of copper alone, for example).
    if (moved) {
      const positions = geometry.getAttribute('position') as BufferAttribute;
      const depth = this.cells.triangleDepth;
      for (let triangle = 0; triangle < count; triangle += 3) {
        const gone = depth[triangle / 3] > sweep;
        for (let corner = 0; corner < 3; corner++) {
          const vertex = triangle + corner;
          // A removed triangle puts its three corners on its first one.
          const source = gone ? triangle : vertex;
          const at = vertex * 3;
          const from = source * 3;
          const group = this.vertexGroup[source] * 3;
          positions.array[at] = base[from] + offsets[group];
          positions.array[at + 1] = base[from + 1] + offsets[group + 1];
          positions.array[at + 2] = base[from + 2] + offsets[group + 2];
        }
      }
      positions.needsUpdate = true;
      this.lastOffsets.set(offsets);
      this.lastSweep = sweep;
    }

    // Colors depend only on the rest height, the part and the color change: repaint just when those change.
    const key = `${this.state.copper}|${this.highlight}`;
    if (key === this.paintKey) return;
    this.paintKey = key;
    const colors = geometry.getAttribute('color') as BufferAttribute;
    for (let vertex = 0; vertex < count; vertex++) {
      const at = vertex * 3;
      this.skinTone(base[at + 1], this.vertexPart[vertex], tone);
      colors.array[at] = tone.r;
      colors.array[at + 1] = tone.g;
      colors.array[at + 2] = tone.b;
    }
    colors.needsUpdate = true;
  }

  /** The flame stands in the cup of the torch and grows with it, with its glow and the light it throws on the arm and the crown. */
  private placeTorch(torch: number, lift: number) {
    const lit = smooth(0, 1, torch);
    const on = lit > 0.01;
    this.flame.visible = on;
    this.glow.visible = on;
    this.flame.position.copy(this.flameBase).y += lift;
    this.flame.scale.setScalar(Math.max(lit, 1e-3));
    this.glow.position.copy(this.flame.position).y += FLAME_HEIGHT / 2;
    this.glow.scale.setScalar(TORCH.glowRadius * Math.max(lit, 1e-3));
    this.glow.material.uniforms.uOpacity.value = TORCH.glowOpacity * lit;
    this.light.position.copy(this.flame.position).y += FLAME_HEIGHT * 0.7;
    this.light.intensity = TORCH.light.intensity * lit;
  }

  setHighlight(part: string | null) {
    this.highlight = part as LibertyPart | null;
  }

  /** The nearest part under the ray (the haze, the flame and the glow sit on the sky layer, which rays skip). */
  pick(raycaster: Raycaster): string | null {
    const targets = [this.skinMesh, this.stoneMesh, this.ironMesh, this.fort].filter((object) => object.visible);
    const [hit] = raycaster.intersectObjects(targets, false);
    if (!hit) return null;
    if (hit.object === this.skinMesh) return hit.face ? PART_NAMES[this.vertexPart[hit.face.a]] : null;
    if (hit.object === this.stoneMesh) return 'pedestal';
    if (hit.object === this.ironMesh) return 'pylon';
    return 'fort';
  }

  get current(): LibertyState {
    return this.state;
  }

  dispose() {
    for (const mesh of [this.stoneMesh, this.ironMesh]) {
      mesh.geometry.dispose();
      mesh.dispose();
    }
    for (const mesh of [this.fort, this.skinMesh, this.flame, this.glow, ...this.mist]) {
      mesh.geometry.dispose();
      (mesh.material as Material).dispose();
    }
    this.fortMaterial.dispose();
    this.plaster.dispose();
    this.skinPlaster.dispose();
    this.light.dispose();
    this.root.removeFromParent();
  }
}
