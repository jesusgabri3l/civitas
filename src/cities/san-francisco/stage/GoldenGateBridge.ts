import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
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
import { yieldToMain } from '../../../engine/utils/yieldToMain';
import { applyExploreFocus, createToonPlaster, type MonumentModel } from '../../../engine/stages/shared/monument';
import {
  ARCH,
  BRIDGE,
  cableHeight,
  COLORS,
  DECK,
  MIST,
  NET,
  PLASTER,
  REST,
  SAN_FRANCISCO_ENV,
  SCALE,
  TOP_SHADE,
  TOWER,
  type BridgeState,
} from './sanFranciscoConfig';

/** The parts of the bridge that have a card in the Explore chapter (ids of the cards in src/cities/san-francisco/story.ts). */
export type BridgePart = 'tower' | 'cable' | 'hangers' | 'deck' | 'pier' | 'anchorage' | 'arch';

type Shape = 'box' | 'tube';

/** What a piece does while the story builds the bridge: it grows with `state[key]` between `from` and `to`, about `anchor`. */
interface Growth {
  key: 'towers' | 'cables' | 'deck';
  from: number;
  to: number;
  anchor: 'center' | 'bottom' | 'top';
}

/** A painted piece: striped by the Navy or not, where the front of the orange reaches it (0..1), which band of the stripes it is on, and its fall-off of light. */
interface Paint {
  stripe: boolean;
  cover: number;
  band: number;
  shade: number;
}

interface Spec {
  part: BridgePart;
  /** Stone color of a piece that is never painted (piers, anchorages, viaducts, arch). */
  tint?: number;
  paint?: Paint;
  growth?: Growth;
}

interface Piece {
  shape: Shape;
  position: Vector3;
  quaternion: Quaternion;
  scale: Vector3;
  part: BridgePart;
  tint: number;
  paint: Paint | null;
  growth: Growth | null;
}

interface PieceSet {
  pieces: Piece[];
  mesh: InstancedMesh;
}

const UP = new Vector3(0, 1, 0);
const NO_ROTATION = new Quaternion();
/** Share of the length of a cable, hanger or deck that is growing at once (the front, in plaster light). */
const FRONT = { cable: 0.1, hanger: 0.1, deck: 0.12 } as const;
/** Width of the front of the orange over the stripes (share of the whole path). */
const COVER_SOFT = 0.12;
const CABLE_SHARE = 0.8;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
/** Meters from `x` to the nearest tower along the bridge. */
const fromTower = (x: number) => Math.min(Math.abs(x - BRIDGE.towerX), Math.abs(x + BRIDGE.towerX));
/** Where the front of the orange reaches a point of the span: `start` at the tower, 1 at the center of the main span. */
const coverAlong = (x: number, start: number) => start + (1 - start) * clamp01(fromTower(x) / BRIDGE.towerX);
/** The front of the orange comes down the towers first: 0 at the top, 0.35 at the piers. */
const coverDown = (y: number) => 0.35 * clamp01((BRIDGE.towerTop - y) / (BRIDGE.towerTop - BRIDGE.pierTop));
const shadeAt = (y: number) => 1 - TOP_SHADE * clamp01(y / BRIDGE.towerTop);
const legSection = (t: number) => ({
  x: TOWER.base.x + (TOWER.top.x - TOWER.base.x) * t,
  z: TOWER.base.z + (TOWER.top.z - TOWER.base.z) * t,
});

const matrix = new Matrix4();
const position = new Vector3();
const scale = new Vector3();
const color = new Color();
const orange = new Color(COLORS.orange);
const primer = new Color(COLORS.primer);
const black = new Color(COLORS.stripeBlack);
const yellow = new Color(COLORS.stripeYellow);
const plasterLight = new Color(COLORS.plasterLight);
const ground = new Color(SAN_FRANCISCO_ENV.backdrop);

/** Sheet of fog, computed per pixel (no texture: iOS Safari tinted canvas textures with color speckles); an ellipse as long as the bridge. */
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

/**
 * The Golden Gate Bridge as a painted maquette (docs/ART-DIRECTION.md §6, brief exception: painted, not plaster): the real silhouette
 * in meters (`sanFranciscoConfig`), two instanced meshes for the whole bridge (boxes: towers, portals, bracing, roadway, trusses,
 * hangers, piers, anchorages, viaducts, arch; tubes: the cable segments), the net as lines and the fog as shader sheets. `setState`
 * places and paints every piece for a story state as a pure function of it.
 */
export class GoldenGateBridge implements MonumentModel<BridgeState> {
  readonly root = new Group();
  private readonly plaster = createToonPlaster(PLASTER.color, PLASTER.bands);
  private readonly boxGeometry = new BoxGeometry(1, 1, 1);
  private readonly tubeGeometry = new CylinderGeometry(0.5, 0.5, 1, 8, 1);
  private readonly pieces: Record<Shape, Piece[]> = { box: [], tube: [] };
  private sets!: Record<Shape, PieceSet>;
  private net!: LineSegments<BufferGeometry, LineBasicMaterial>;
  private readonly mist: Mesh<PlaneGeometry, ShaderMaterial>[] = [];
  private state: BridgeState = { ...REST };
  private highlight: BridgePart | null = null;
  private matricesPlaced = false;

  private constructor() {
    this.root.name = 'golden-gate-bridge';
    this.root.scale.setScalar(SCALE);
  }

  /** Builds in slices (towers and ground structures, then cables and hangers, then the roadway, then meshes), handing the main thread back between them. */
  static async create() {
    const model = new GoldenGateBridge();
    model.buildTowers();
    model.buildPiers();
    model.buildAnchorages();
    model.buildArch();
    await yieldToMain();
    model.buildCables();
    model.buildHangers();
    await yieldToMain();
    model.buildDeck();
    await yieldToMain();
    model.assemble();
    return model;
  }

  private assemble() {
    const build = (shape: Shape, geometry: BufferGeometry): PieceSet => {
      const mesh = new InstancedMesh(geometry, this.plaster.material, this.pieces[shape].length);
      mesh.name = `golden-gate-${shape}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      // Fixed bounds (picking tests the sphere first).
      mesh.boundingSphere = new Sphere(new Vector3(0, 100, 0), BRIDGE.halfLength * 1.2);
      mesh.setColorAt(0, new Color(1, 1, 1));
      return { pieces: this.pieces[shape], mesh };
    };
    this.sets = { box: build('box', this.boxGeometry), tube: build('tube', this.tubeGeometry) };
    this.root.add(this.sets.box.mesh, this.sets.tube.mesh);
    this.buildNet();
    this.buildMist();
    this.setState(REST);
  }

  // ---------- Building the pieces (real meters) ----------

  private add(shape: Shape, at: Vector3, rotation: Quaternion, size: Vector3, spec: Spec) {
    this.pieces[shape].push({
      shape,
      position: at,
      quaternion: rotation,
      scale: size,
      part: spec.part,
      tint: spec.tint ?? COLORS.stoneMid,
      paint: spec.paint ?? null,
      growth: spec.growth ?? null,
    });
  }

  private box(x: number, y: number, z: number, sx: number, sy: number, sz: number, spec: Spec) {
    this.add('box', new Vector3(x, y, z), NO_ROTATION, new Vector3(sx, sy, sz), spec);
  }

  /** A bar from one point to another (a square bar, or a round one for the cables). */
  private bar(from: Vector3, to: Vector3, thickness: number, spec: Spec, shape: Shape = 'box', stretch = 1) {
    const direction = new Vector3().subVectors(to, from);
    const length = direction.length();
    if (length < 0.1) return;
    this.add(shape, new Vector3().addVectors(from, to).multiplyScalar(0.5), new Quaternion().setFromUnitVectors(UP, direction.divideScalar(length)), new Vector3(thickness, length * stretch, thickness), spec);
  }

  /** Growth of a tower piece centered at height `y`: the towers rise by cells, the Marin one first (0..0.5) and then San Francisco (0.5..1). */
  private towerGrowth(towerIndex: number, y: number, anchor: Growth['anchor']): Growth {
    const { cells } = TOWER;
    const cellHeight = (BRIDGE.towerTop - BRIDGE.pierTop) / cells;
    const cell = Math.min(cells - 1, Math.max(0, Math.floor((y - BRIDGE.pierTop) / cellHeight)));
    // Three cells rise at once, so there is a front (the span that is rising, in plaster light).
    const lead = (0.5 / cells) * 3;
    const from = towerIndex * 0.5 + (0.5 - lead) * (cell / (cells - 1));
    return { key: 'towers', from, to: from + lead, anchor };
  }

  /** Two towers (Marin on +x, then San Francisco on -x): legs of stepped cells with ribs, portals above the roadway, cross bracing under it. */
  private buildTowers() {
    const { towerX, towerTop, pierTop, cableZ } = BRIDGE;
    const { cells } = TOWER;
    const cellHeight = (towerTop - pierTop) / cells;
    [1, -1].forEach((side, towerIndex) => {
      const x = side * towerX;
      for (let cell = 0; cell < cells; cell++) {
        const section = legSection(cell / (cells - 1));
        const y = pierTop + (cell + 0.5) * cellHeight;
        const spec: Spec = {
          part: 'tower',
          growth: this.towerGrowth(towerIndex, y, 'bottom'),
          paint: { stripe: true, cover: coverDown(y), band: cell, shade: shadeAt(y) },
        };
        for (const z of [-cableZ, cableZ]) {
          this.box(x, y, z, section.x, cellHeight, section.z, spec);
          // Morrow's vertical ribs on the faces along the bridge.
          for (const face of [-1, 1]) this.box(x + (face * section.x) / 2, y, z, 1, cellHeight, section.z * 0.45, spec);
        }
      }

      // The saddles of the cables, over the legs.
      const topSpec: Spec = {
        part: 'tower',
        growth: this.towerGrowth(towerIndex, towerTop - 1, 'bottom'),
        paint: { stripe: true, cover: 0, band: cells, shade: shadeAt(towerTop) },
      };
      for (const z of [-cableZ, cableZ]) this.box(x, towerTop + 1.2, z, 7, 2.4, 5, topSpec);

      // Portals above the roadway.
      TOWER.portals.forEach((y, index) => {
        const section = legSection((y - pierTop) / (towerTop - pierTop));
        this.box(x, y, 0, section.x - 1.2, TOWER.portalHeight, 2 * cableZ - section.z + 0.4, {
          part: 'tower',
          growth: this.towerGrowth(towerIndex, y, 'bottom'),
          paint: { stripe: true, cover: coverDown(y), band: index, shade: shadeAt(y) },
        });
      });

      // Under the roadway the legs are tied with X braces, one pair per bay, and struts between bays.
      const inner = cableZ - TOWER.base.z / 2;
      TOWER.bays.slice(0, -1).forEach((y0, index) => {
        const y1 = TOWER.bays[index + 1];
        const middle = (y0 + y1) / 2;
        const spec: Spec = {
          part: 'tower',
          growth: this.towerGrowth(towerIndex, middle, 'center'),
          paint: { stripe: true, cover: coverDown(middle), band: index, shade: shadeAt(middle) },
        };
        this.bar(new Vector3(x, y0, -inner), new Vector3(x, y1, inner), 2.2, spec);
        this.bar(new Vector3(x, y0, inner), new Vector3(x, y1, -inner), 2.2, spec);
        if (index > 0) this.box(x, y0, 0, TOWER.base.x - 2, 2.4, 2 * inner, { ...spec, growth: this.towerGrowth(towerIndex, y0, 'center') });
      });
    });
  }

  /** The piers under the towers and, at San Francisco, the fender wall that surrounds its pier (finished in October 1934). */
  private buildPiers() {
    const { towerX, pierTop } = BRIDGE;
    for (const side of [-1, 1]) this.box(side * towerX, pierTop / 2, 0, 30, pierTop, 52, { part: 'pier', tint: COLORS.stoneMid });
    const x = -towerX;
    const wall: Spec = { part: 'pier', tint: COLORS.stoneDark };
    for (const z of [-47.5, 47.5]) this.box(x, 5.5, z, 80, 11, 5, wall);
    for (const dx of [-37.5, 37.5]) this.box(x + dx, 5.5, 0, 5, 11, 90, wall);
  }

  /** The anchorages that hold the cables, and the access viaducts to the edge of the pedestal (cut there: no shore). */
  private buildAnchorages() {
    const { cableEndX, deckY, deckWidth, halfLength, sideSpan, towerX } = BRIDGE;
    const anchorage: Spec = { part: 'anchorage', tint: COLORS.stoneDark };
    const viaduct: Spec = { part: 'anchorage', tint: COLORS.stoneLight };
    const start = towerX + sideSpan;
    const panels = 13;
    const length = (halfLength - start) / panels;
    for (const side of [-1, 1]) {
      this.box(side * (cableEndX + 22), 27, 0, 44, 54, 56, anchorage);
      for (let index = 0; index < panels; index++) {
        this.box(side * (start + (index + 0.5) * length), deckY - 0.9, 0, length, 3, deckWidth, viaduct);
        const bentX = side * (start + index * length);
        // The arch carries the roadway where it stands: no bent there.
        const underArch = Math.abs(bentX - ARCH.x) < ARCH.halfSpan + 15;
        if (index === 0 || index % 2 !== 0 || underArch) continue;
        for (const z of [-11, 11]) this.box(bentX, (deckY - 2.4) / 2, z, 3.6, deckY - 2.4, 3.6, viaduct);
      }
    }
  }

  /** The Fort Point arch under the roadway at the San Francisco end: two ribs on a half ellipse, abutments and posts up to the slab. */
  private buildArch() {
    const { x: center, halfSpan, footY, rise, ribZ } = ARCH;
    const spec: Spec = { part: 'arch', tint: COLORS.stoneMid };
    const steps = 12;
    const along = (index: number) => {
      const angle = (Math.PI * index) / steps;
      return { x: center + halfSpan * Math.cos(angle), y: footY + rise * Math.sin(angle) };
    };
    for (const z of [-ribZ, ribZ]) {
      for (let index = 0; index < steps; index++) {
        const from = along(index);
        const to = along(index + 1);
        this.bar(new Vector3(from.x, from.y, z), new Vector3(to.x, to.y, z), 3.2, spec);
      }
      for (let index = 1; index < steps; index++) {
        const node = along(index);
        this.bar(new Vector3(node.x, node.y, z), new Vector3(node.x, DECK.slabY - 0.8, z), 1.6, spec);
      }
    }
    for (const side of [-1, 1]) this.box(center + side * (halfSpan + 2), footY / 2, 0, 8, footY, 2 * ribZ + 6, { part: 'arch', tint: COLORS.stoneDark });
  }

  /** The two main cables, from anchorage to anchorage over the towers, as round segments that are spun from the San Francisco end. */
  private buildCables() {
    const { towerX, cableEndX, cableZ, cableRadius } = BRIDGE;
    const xs = [
      ...Array.from({ length: 18 }, (_, index) => -cableEndX + ((cableEndX - towerX) * index) / 18),
      ...Array.from({ length: 64 }, (_, index) => -towerX + (2 * towerX * index) / 64),
      ...Array.from({ length: 19 }, (_, index) => towerX + ((cableEndX - towerX) * index) / 18),
    ];
    for (const z of [-cableZ, cableZ]) {
      for (let index = 0; index < xs.length - 1; index++) {
        const a = new Vector3(xs[index], cableHeight(xs[index]), z);
        const b = new Vector3(xs[index + 1], cableHeight(xs[index + 1]), z);
        const middleX = (a.x + b.x) / 2;
        const along = (middleX + cableEndX) / (2 * cableEndX);
        const from = (CABLE_SHARE - FRONT.cable) * along;
        this.bar(
          a,
          b,
          2 * cableRadius,
          {
            part: 'cable',
            growth: { key: 'cables', from, to: from + FRONT.cable, anchor: 'center' },
            paint: { stripe: true, cover: coverAlong(middleX, 0.04), band: Math.floor(index / 2), shade: shadeAt((a.y + b.y) / 2) },
          },
          'tube',
          1.04,
        );
      }
    }
  }

  /** The hangers, one every 15 m on each cable down to the truss (where the cable is high enough over the roadway), dropped after the cables. */
  private buildHangers() {
    const { towerX, cableEndX, cableZ } = BRIDGE;
    const pitch = 15;
    const xs: number[] = [];
    for (const side of [-1, 1]) {
      for (let index = 0; pitch * (index + 0.5) < towerX - 10; index++) xs.push(side * pitch * (index + 0.5));
      for (let along = pitch; cableHeight(towerX + along) - DECK.trussDepthTop > 3 && along < BRIDGE.sideSpan; along += pitch) xs.push(side * (towerX + along));
    }
    for (const x of xs) {
      const top = cableHeight(x);
      const length = top - DECK.trussDepthTop;
      const along = (x + cableEndX) / (2 * cableEndX);
      const from = CABLE_SHARE + (1 - CABLE_SHARE - FRONT.hanger) * along;
      for (const z of [-cableZ, cableZ]) {
        this.box(x, DECK.trussDepthTop + length / 2, z, 1.4, length, 1.4, {
          part: 'hangers',
          growth: { key: 'cables', from, to: from + FRONT.hanger, anchor: 'top' },
          paint: { stripe: false, cover: coverAlong(x, 0.04), band: 0, shade: shadeAt(top) },
        });
      }
    }
  }

  /** The roadway in panels of about 15 m with its two stiffening trusses: each tower grows it toward the center and toward the shore at the same pace. */
  private buildDeck() {
    const { towerX, sideSpan, deckWidth, cableZ } = BRIDGE;
    const sections = [
      { panels: 43, length: towerX, toward: -1 },
      { panels: 23, length: sideSpan, toward: 1 },
    ];
    for (const side of [-1, 1]) {
      for (const { panels, length, toward } of sections) {
        const pitch = length / panels;
        for (let index = 0; index < panels; index++) {
          const distance = (index + 0.5) * pitch;
          const x = side * (towerX + toward * distance);
          const from = (distance / towerX) * (1 - FRONT.deck);
          const spec: Spec = {
            part: 'deck',
            growth: { key: 'deck', from, to: from + FRONT.deck, anchor: 'center' },
            paint: { stripe: true, cover: coverAlong(x, 0.25), band: index, shade: shadeAt(DECK.slabY) },
          };
          this.box(x, DECK.slabY, 0, pitch, DECK.slabThickness, deckWidth, spec);
          const edge = x - pitch / 2;
          const flip = index % 2 === 0 ? 1 : -1;
          for (const z of [-cableZ, cableZ]) {
            this.box(x, DECK.topChordY, z, pitch, 1.2, 1.4, spec);
            this.box(x, DECK.bottomChordY, z, pitch, 1, 1.4, spec);
            this.box(edge, (DECK.trussBottom + DECK.slabY) / 2, z, 1.2, DECK.slabY - DECK.trussBottom, 1.2, spec);
            this.bar(new Vector3(x - (flip * pitch) / 2, DECK.trussBottom, z), new Vector3(x + (flip * pitch) / 2, DECK.slabY, z), 1, spec);
          }
        }
      }
    }
  }

  /** The net under the roadway, from tower to tower: lines, in the plaster-light of what the story changes (drawing, not surface: out of the ink pass). */
  private buildNet() {
    const { towerX } = BRIDGE;
    const { y, halfWidth, pitch, lines } = NET;
    const points: number[] = [];
    for (let x = -towerX; x <= towerX + 0.01; x += pitch) points.push(x, y, -halfWidth, x, y, halfWidth);
    for (let line = 0; line <= lines; line++) {
      const z = -halfWidth + (2 * halfWidth * line) / lines;
      points.push(-towerX, y, z, towerX, y, z);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
    this.net = new LineSegments(geometry, new LineBasicMaterial({ color: COLORS.plasterLight, transparent: true, opacity: 0, depthWrite: false }));
    this.net.name = 'golden-gate-net';
    this.net.layers.set(SKY_LAYER);
    this.net.frustumCulled = false;
    this.root.add(this.net);
  }

  /** Two sheets of fog at water level, the lower one under the roadway (out of the ink pass: they are air, not shapes). */
  private buildMist() {
    for (const sheet of [MIST.low, MIST.high]) {
      const mesh = new Mesh(new PlaneGeometry(sheet.size[0], sheet.size[1]).rotateX(-Math.PI / 2), createMistMaterial(sheet.opacity));
      mesh.position.y = sheet.y;
      mesh.layers.set(SKY_LAYER);
      mesh.frustumCulled = false;
      this.mist.push(mesh);
      this.root.add(mesh);
    }
  }

  // ---------- State ----------

  /** How much of a piece exists (0..1) for a state. Pieces with no growth are always whole. */
  private growthOf(piece: Piece, state: BridgeState) {
    const { growth } = piece;
    if (!growth) return 1;
    return smooth((state[growth.key] - growth.from) / (growth.to - growth.from));
  }

  /** Color of a piece: stone if never painted; else orange or red lead, the Navy's stripes over it and the front of the orange over both. */
  private paintOf(piece: Piece, state: BridgeState, growth: number) {
    const { paint } = piece;
    if (!paint) return color.setHex(piece.tint);
    color.copy(orange).lerp(primer, state.primer);
    if (paint.stripe && state.stripes > 0) color.lerp(paint.band % 2 === 0 ? black : yellow, state.stripes);
    const front = clamp01((state.cover * (1 + COVER_SOFT) - paint.cover) / COVER_SOFT);
    if (front > 0) color.lerp(orange, front);
    color.multiplyScalar(paint.shade);
    // What is rising, spinning, dropping or closing is plaster light, and returns to its paint when it is done.
    if (growth > 0 && growth < 1) color.lerp(plasterLight, 1 - growth);
    return color;
  }

  /** Places and paints every piece for a story state. About two thousand matrices: call it on the frames where the state moves. */
  setState(state: BridgeState) {
    // Matrices only depend on these three; when they did not move, only the colors are redone.
    const geometryMoved =
      !this.matricesPlaced || state.towers !== this.state.towers || state.cables !== this.state.cables || state.deck !== this.state.deck;
    this.matricesPlaced = true;
    Object.assign(this.state, state);
    for (const set of [this.sets.box, this.sets.tube]) {
      set.pieces.forEach((piece, index) => {
        const growth = this.growthOf(piece, state);
        if (geometryMoved) {
          position.copy(piece.position);
          scale.copy(piece.scale);
          if (growth <= 0) {
            scale.setScalar(0);
          } else if (growth < 1 && piece.growth) {
            const { anchor } = piece.growth;
            if (anchor === 'center') {
              scale.multiplyScalar(growth);
            } else {
              scale.y *= growth;
              position.y += (anchor === 'bottom' ? -1 : 1) * ((1 - growth) * piece.scale.y) / 2;
            }
          }
          matrix.compose(position, piece.quaternion, scale);
          set.mesh.setMatrixAt(index, matrix);
        }

        const paint = this.paintOf(piece, state, growth);
        // In Explore the chosen part goes back to plaster and the rest sinks toward the ground (never a lerp of our own to the orange: it would not contrast).
        if (this.highlight) applyExploreFocus(paint, piece.part === this.highlight, plasterLight, ground);
        set.mesh.setColorAt(index, paint);
      });
      if (geometryMoved) set.mesh.instanceMatrix.needsUpdate = true;
      if (set.mesh.instanceColor) set.mesh.instanceColor.needsUpdate = true;
    }
    this.net.material.opacity = state.net;
    this.net.visible = state.net > 0.01;
    // false = only the color changed (the story skips the shadow refresh).
    return geometryMoved;
  }

  setHighlight(part: string | null) {
    this.highlight = part as BridgePart | null;
  }

  /** The first part under the ray (the net and the fog are looked through). */
  pick(raycaster: Raycaster): string | null {
    const hits = raycaster.intersectObjects([this.sets.box.mesh, this.sets.tube.mesh], false);
    for (const hit of hits) {
      if (hit.instanceId === undefined) continue;
      const shape: Shape = hit.object === this.sets.tube.mesh ? 'tube' : 'box';
      return this.sets[shape].pieces[hit.instanceId].part;
    }
    return null;
  }

  get current(): BridgeState {
    return this.state;
  }

  dispose() {
    for (const set of Object.values(this.sets)) set.mesh.dispose();
    this.boxGeometry.dispose();
    this.tubeGeometry.dispose();
    this.net.geometry.dispose();
    this.net.material.dispose();
    for (const sheet of this.mist) {
      sheet.geometry.dispose();
      sheet.material.dispose();
    }
    this.plaster.dispose();
    this.root.removeFromParent();
  }
}
