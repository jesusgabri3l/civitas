import {
  BoxGeometry,
  type Raycaster,
  BufferGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  MeshToonMaterial,
  Quaternion,
  Shape,
  Vector2,
  Vector3,
} from 'three';
import { createToonPlaster, type MonumentModel } from '../../../engine/stages/shared/monument';
import { ACCENT, BASE_Y, DRUMS, EXPLODE_LIFT, INTACT, PAINT, PARTHENON_MODEL, PLASTER, TINT, type AthensState } from './athensConfig';
import { deriveDimensions } from './parthenonDimensions';
import { createRandom } from '../../../engine/utils/random';
import { yieldToMain } from '../../../engine/utils/yieldToMain';

/** What happens to a piece in the 1687 ruin. */
type RuinRule =
  | { kind: 'keep' }
  /** Gone in the blast; `restorable` pieces come back with the restoration. `delay` staggers the collapse (0..0.5). */
  | { kind: 'remove'; delay: number; restorable: boolean }
  /** Cut down to `share` of its height, bottom anchored (cella walls). */
  | { kind: 'shrink'; share: number }
  /** Debris: appears with the blast. */
  | { kind: 'appear'; delay: number }
  /** The last drum left standing on a broken column: takes the accent with the ruin. */
  | { kind: 'broken'; restorable: boolean };

type Layer = keyof typeof EXPLODE_LIFT | 'base' | 'drum';

interface Piece {
  position: Vector3;
  quaternion: Quaternion;
  scale: Vector3;
  layer: Layer;
  /** Drum index (exploded view: each drum rises a little more). */
  drum: number;
  ruin: RuinRule;
  tint: number;
  paint: number | null;
  /** Taken away by Elgin (1801-1812). */
  elgin: boolean;
  /** Card of the Explore chapter this piece opens when tapped (null: not pickable). */
  part: AthensPart | null;
}

/** The parts of the temple that have a card in the Explore chapter (ids of the cards in src/cities/athens/story.ts). */
export type AthensPart = 'column' | 'frieze' | 'pediment' | 'cella' | 'crepidoma';

/** Faceted copy of a geometry: no shared vertices, so each face keeps its own normal (20 facets read as the flutes). */
function faceted(geometry: BufferGeometry): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  flat.computeVertexNormals();
  return flat;
}

const smooth = (from: number, to: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/** One instanced mesh of the maquette and the pieces it draws. */
class PieceSet {
  readonly pieces: Piece[] = [];
  mesh: InstancedMesh | null = null;

  constructor(readonly geometry: BufferGeometry) {}

  add(piece: Partial<Piece> & Pick<Piece, 'position' | 'layer'>) {
    this.pieces.push({
      quaternion: new Quaternion(),
      scale: new Vector3(1, 1, 1),
      drum: 0,
      ruin: { kind: 'keep' },
      tint: TINT.plaster,
      paint: null,
      elgin: false,
      part: null,
      ...piece,
    });
  }

  build(material: MeshToonMaterial, name: string) {
    const mesh = new InstancedMesh(this.geometry, material, this.pieces.length);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    // Colors exist from the start, so the program compiled at load is the one every state uses.
    mesh.setColorAt(0, new Color(1, 1, 1));
    this.mesh = mesh;
    return mesh;
  }
}

const matrix = new Matrix4();
const position = new Vector3();
const scale = new Vector3();
const color = new Color();
const accent = new Color(ACCENT);
const paintColor = new Color();

/**
 * The Parthenon as a low-poly plaster maquette (docs/ART-DIRECTION.md §6): real proportions (`parthenonDimensions`), primitives
 * only, 20-sided drums with flat shading for the flutes, one toon material in three bands, tints per instance. Eight instanced
 * meshes. `setState` places every piece for a story state (exploded, painted, ruin, Elgin, restoration) as a pure function of it.
 */
export class Parthenon implements MonumentModel<AthensState> {
  readonly root = new Group();
  private readonly sets: PieceSet[] = [];
  private readonly plaster = createToonPlaster(PLASTER.color, PLASTER.bands);
  private state: AthensState = { ...INTACT };
  /** Stylobate surface: pieces knocked down by the blast fall to it. */
  private floorY = 0;
  /** Part tinted toward the accent (Explore chapter). */
  private highlight: AthensPart | null = null;

  private constructor() {
    this.root.name = 'parthenon';
  }

  /** Builds in slices (blocks, drums, pediments), handing the main thread back between them. */
  static async create(seed = 7) {
    const model = new Parthenon();
    await model.buildPieces(seed);
    model.sets.forEach((set, index) => model.root.add(set.build(model.plaster.material, `parthenon-${index}`)));
    model.setState(INTACT);
    return model;
  }

  private async buildPieces(seed: number) {
    const d = deriveDimensions(PARTHENON_MODEL);
    const rnd = createRandom(seed); // same rubble and broken columns on every visit
    const top = BASE_Y + d.stylobateTop; // stylobate surface
    this.floorY = top;
    const shaftHeight = d.config.columnHeight - d.capitalHeight;
    const drumHeight = shaftHeight / DRUMS;
    const rBottom = d.columnBase / 2;
    const rTop = d.columnTop / 2;
    const radiusAt = (f: number) => rBottom + (rTop - rBottom) * f + d.config.entasis * rBottom * Math.sin(Math.PI * f) * 0.6;
    const bay = (2 * d.axisHalfX) / (d.config.columnsLong - 1);
    const bayShort = (2 * d.axisHalfZ) / (d.config.columnsShort - 1);
    // Half width of the hole the 1687 blast opened in the middle of both long sides (the builder's ruin gap).
    const gap = bay * 3.2;
    const columnTopY = top + d.config.columnHeight;
    const architraveTop = columnTopY + d.architraveHeight;
    const friezeTop = architraveTop + d.friezeHeight;
    const geisonTop = friezeTop + d.geisonHeight;

    // ---------- Blocks: one unit box, scaled per piece ----------
    const blocks = new PieceSet(new BoxGeometry(1, 1, 1));
    this.sets.push(blocks);
    const block = (x: number, y: number, z: number, sx: number, sy: number, sz: number, extra: Partial<Piece> & { layer: Layer }) =>
      blocks.add({ position: new Vector3(x, y, z), scale: new Vector3(sx, sy, sz), ...extra });

    // Crepidoma: three steps, the top one is the stylobate.
    for (let k = 0; k < 3; k++) {
      const grow = 2 * d.stepTread * (2 - k);
      block(0, BASE_Y + d.stepRise * (k + 0.5), 0, d.config.stylobateLength + grow, d.stepRise, d.config.stylobateWidth + grow, {
        layer: 'base',
        part: 'crepidoma',
        tint: k === 2 ? TINT.plaster : TINT.recess,
      });
    }

    // Cella: four walls up to the architrave; the long ones are cut down by the blast.
    const wall = d.cellaWall;
    const wallHeight = architraveTop - top;
    const wallY = top + wallHeight / 2;
    for (const side of [-1, 1]) {
      block(0, wallY, side * d.cellaHalfZ, 2 * d.cellaHalfX, wallHeight, wall, { layer: 'cella', part: 'cella', tint: TINT.recess, ruin: { kind: 'shrink', share: 0.32 } });
      block(side * d.cellaHalfX, wallY, 0, wall, wallHeight, 2 * d.cellaHalfZ, { layer: 'cella', part: 'cella', tint: TINT.recess });
    }

    // Entablature: architrave, frieze core, geison, one block per bay so the ruin can open a gap. Long sides run past the corners.
    const ring = (half: number, y: number, height: number, layer: Layer, tint: number, paint: number | null) => {
      for (const side of [-1, 1]) {
        for (let i = 0; i < d.config.columnsLong - 1; i++) {
          const x0 = -d.axisHalfX + i * bay - (i === 0 ? half : 0);
          const x1 = -d.axisHalfX + (i + 1) * bay + (i === d.config.columnsLong - 2 ? half : 0);
          const mid = (x0 + x1) / 2;
          const gone = Math.abs(mid) < gap;
          block(mid, y + height / 2, side * d.axisHalfZ, x1 - x0, height, 2 * half, {
            layer,
            part: 'frieze',
            tint,
            paint,
            ruin: gone ? { kind: 'remove', delay: 0.15 + rnd() * 0.2, restorable: side < 0 } : { kind: 'keep' },
          });
        }
        for (let i = 0; i < d.config.columnsShort - 1; i++) {
          const z0 = -d.axisHalfZ + i * bayShort + (i === 0 ? half : 0);
          const z1 = -d.axisHalfZ + (i + 1) * bayShort - (i === d.config.columnsShort - 2 ? half : 0);
          block(side * d.axisHalfX, y + height / 2, (z0 + z1) / 2, 2 * half, height, z1 - z0, { layer, part: 'frieze', tint, paint });
        }
      }
    };
    ring(d.architraveHalf, columnTopY, d.architraveHeight, 'architrave', TINT.plaster, null);
    ring(d.friezeCoreHalf, architraveTop, d.friezeHeight, 'frieze', TINT.plaster, null);
    ring(d.geisonOuterHalf, friezeTop, d.geisonHeight, 'geison', TINT.plaster, PAINT.moulding);

    // Triglyphs: over every column and every mid-bay, on the outer face of the frieze.
    const glyphY = architraveTop + d.friezeHeight / 2;
    const glyphFace = d.friezeCoreHalf + 0.08;
    for (const side of [-1, 1]) {
      for (let j = 0; j <= 2 * (d.config.columnsLong - 1); j++) {
        const x = -d.axisHalfX + (j * bay) / 2;
        block(x, glyphY, side * (d.axisHalfZ + glyphFace), 0.8, d.friezeHeight * 0.92, 0.18, {
          layer: 'frieze',
          part: 'frieze',
          tint: TINT.triglyph,
          paint: PAINT.triglyph,
          ruin: Math.abs(x) < gap ? { kind: 'remove', delay: 0.15 + rnd() * 0.2, restorable: side < 0 } : { kind: 'keep' },
        });
      }
      for (let j = 1; j < 2 * (d.config.columnsShort - 1); j++) {
        const z = -d.axisHalfZ + (j * bayShort) / 2;
        block(side * (d.axisHalfX + glyphFace), glyphY, z, 0.18, d.friezeHeight * 0.92, 0.8, { layer: 'frieze', part: 'frieze', tint: TINT.triglyph, paint: PAINT.triglyph });
      }
    }

    // Roof: two sloping slabs between the pediments (gone in the ruin).
    const roofHalfZ = d.axisHalfZ + d.geisonOuterHalf;
    const roofLength = 2 * (d.axisHalfX + d.architraveHalf);
    const slope = Math.atan2(d.pedimentHeight, roofHalfZ);
    const roofWidth = Math.hypot(d.pedimentHeight, roofHalfZ);
    for (const side of [-1, 1]) {
      blocks.add({
        position: new Vector3(0, geisonTop + d.pedimentHeight / 2 + 0.2, (side * roofHalfZ) / 2),
        quaternion: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), side * slope),
        scale: new Vector3(roofLength, 0.4, roofWidth),
        layer: 'roof',
        ruin: { kind: 'remove', delay: 0, restorable: false },
      });
    }

    // Pediment sculpture: blocks standing on the horizontal cornice, taller toward the middle. Elgin took most of them.
    const faceX = d.axisHalfX + d.architraveHalf;
    for (const end of [-1, 1]) {
      const figures = 11;
      for (let k = 0; k < figures; k++) {
        const z = -roofHalfZ * 0.84 + (k * 2 * roofHalfZ * 0.84) / (figures - 1);
        const room = d.pedimentHeight * (1 - Math.abs(z) / roofHalfZ) - 0.3;
        const height = Math.max(0.5, room * (0.6 + rnd() * 0.3));
        block(end * (faceX + 0.35), geisonTop + height / 2, z, 0.7, height, 1.6 + rnd() * 0.8, {
          layer: 'pediment',
          part: 'pediment',
          paint: PAINT.sculpture,
          elgin: rnd() < 0.75,
          ruin: end > 0 && Math.abs(z) < 4 ? { kind: 'remove', delay: 0.1, restorable: false } : { kind: 'keep' },
        });
      }
    }

    // Rubble of 1687 around the gap, on the stylobate and the pedestal.
    for (let k = 0; k < 46; k++) {
      const x = (rnd() * 2 - 1) * (gap + 6);
      const outside = rnd() < 0.45;
      const z = (rnd() < 0.5 ? -1 : 1) * (outside ? d.config.stylobateWidth / 2 + 1.5 + rnd() * 5 : d.axisHalfZ - 3 + rnd() * 5);
      const size = 0.6 + rnd() * 1.6;
      const y = (outside ? BASE_Y : top) + size * 0.3;
      blocks.add({
        position: new Vector3(x, y, z),
        quaternion: new Quaternion().setFromAxisAngle(new Vector3(rnd(), 1, rnd()).normalize(), rnd() * Math.PI),
        scale: new Vector3(size * (1 + rnd()), size * 0.6, size),
        layer: 'base',
        ruin: { kind: 'appear', delay: 0.2 + rnd() * 0.4 },
      });
    }

    await yieldToMain();
    // ---------- Column drums: four lathes, one instanced mesh each ----------
    const columns: { x: number; z: number; restorable: boolean; keep: number }[] = [];
    for (const side of [-1, 1]) {
      for (let i = 0; i < d.config.columnsLong; i++) {
        const x = -d.axisHalfX + i * bay;
        // In the gap a column keeps 0..2 drums (a broken stump) or falls entirely.
        const keep = Math.abs(x) < gap ? Math.floor(rnd() * 3) : DRUMS;
        columns.push({ x, z: side * d.axisHalfZ, restorable: side < 0, keep });
      }
      for (let i = 1; i < d.config.columnsShort - 1; i++) {
        columns.push({ x: side * d.axisHalfX, z: -d.axisHalfZ + i * bayShort, restorable: false, keep: DRUMS });
      }
    }
    for (let drum = 0; drum < DRUMS; drum++) {
      const f0 = drum / DRUMS;
      const f1 = (drum + 1) / DRUMS;
      const profile = [
        new Vector2(0, 0),
        new Vector2(radiusAt(f0), 0),
        new Vector2(radiusAt((f0 + f1) / 2), drumHeight / 2),
        new Vector2(radiusAt(f1), drumHeight),
        new Vector2(0, drumHeight),
      ];
      const drums = new PieceSet(faceted(new LatheGeometry(profile, PARTHENON_MODEL.fluteCount)));
      this.sets.push(drums);
      for (const column of columns) {
        const removed = drum >= column.keep;
        const broken = column.keep < DRUMS && drum === column.keep - 1;
        drums.add({
          position: new Vector3(column.x, top + drum * drumHeight, column.z),
          layer: 'drum',
          part: 'column',
          drum,
          ruin: removed
            ? { kind: 'remove', delay: 0.05 + rnd() * 0.25 + drum * 0.05, restorable: column.restorable }
            : broken
              ? { kind: 'broken', restorable: column.restorable }
              : { kind: 'keep' },
        });
      }
    }

    // Capitals: echinus (cone) and abacus (block).
    const echinusHeight = d.capitalHeight * 0.5;
    const echinus = new PieceSet(faceted(new CylinderGeometry((d.abacusWidth / 2) * 0.92, rTop * 1.04, echinusHeight, PARTHENON_MODEL.fluteCount)));
    this.sets.push(echinus);
    for (const column of columns) {
      const ruin: RuinRule = column.keep < DRUMS ? { kind: 'remove', delay: 0.05, restorable: column.restorable } : { kind: 'keep' };
      echinus.add({ position: new Vector3(column.x, top + shaftHeight + echinusHeight / 2, column.z), layer: 'capital', part: 'column', ruin });
      block(column.x, top + shaftHeight + echinusHeight + echinusHeight / 2, column.z, d.abacusWidth, echinusHeight, d.abacusWidth, {
        layer: 'capital',
        part: 'column',
        ruin,
      });
    }

    await yieldToMain();
    // ---------- Pediments: a triangular prism at each end, the tympanum a shade darker ----------
    const triangle = (half: number, height: number) => {
      const shape = new Shape();
      shape.moveTo(-half, 0);
      shape.lineTo(half, 0);
      shape.lineTo(0, height);
      shape.closePath();
      return shape;
    };
    const frameGeometry = new ExtrudeGeometry(triangle(roofHalfZ, d.pedimentHeight), { depth: 1.4, bevelEnabled: false });
    frameGeometry.translate(0, 0, -1.4);
    const tympanumGeometry = new ExtrudeGeometry(triangle(roofHalfZ - 1.2, d.pedimentHeight - 0.75), { depth: 0.1, bevelEnabled: false });
    const frames = new PieceSet(frameGeometry);
    const tympana = new PieceSet(tympanumGeometry);
    this.sets.push(frames, tympana);
    for (const end of [-1, 1]) {
      const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), end * (Math.PI / 2));
      frames.add({ position: new Vector3(end * faceX, geisonTop, 0), quaternion: turn, layer: 'pediment', part: 'pediment', paint: PAINT.moulding });
      tympana.add({
        position: new Vector3(end * (faceX + 0.02), geisonTop + 0.25, 0),
        quaternion: turn,
        layer: 'pediment',
        part: 'pediment',
        tint: TINT.tympanum,
        paint: PAINT.tympanum,
      });
    }
  }

  /** Places and colors every piece for a story state. Cheap (a few hundred matrices): call it on the frames where the state moves. */
  setState(state: AthensState) {
    this.state = { ...state };
    const { explode, paint, ruin, elgin, restore } = state;
    const spread = 1 + EXPLODE_LIFT.spread * explode;
    for (const set of this.sets) {
      const mesh = set.mesh;
      if (!mesh) continue;
      set.pieces.forEach((piece, index) => {
        let visible = 1;
        let height = 1;
        let lift = 0;
        let toAccent = 0;
        const rule = piece.ruin;
        if (rule.kind === 'remove') {
          // Knocked down: it falls (accelerating) to the stylobate and is gone as it lands, where the rubble appears.
          const r = rule.restorable ? ruin * (1 - restore) : ruin;
          const fall = smooth(rule.delay, rule.delay + 0.45, r);
          lift = -Math.max(0, piece.position.y - this.floorY) * fall * fall;
          visible = 1 - smooth(0.75, 1, fall);
        } else if (rule.kind === 'shrink') {
          height = 1 - (1 - rule.share) * smooth(0, 0.6, ruin);
          toAccent = smooth(0.2, 0.8, ruin) * 0.2;
        } else if (rule.kind === 'appear') {
          visible = smooth(rule.delay, rule.delay + 0.3, ruin);
          toAccent = 1;
        } else if (rule.kind === 'broken') {
          const r = rule.restorable ? ruin * (1 - restore) : ruin;
          toAccent = smooth(0.3, 0.8, r);
        }
        if (piece.elgin) {
          const gone = smooth(0, 1, elgin);
          lift += 18 * gone;
          visible *= 1 - smooth(0.6, 1, elgin);
          toAccent = Math.max(toAccent, smooth(0, 0.3, elgin));
        }
        // Exploded view: each layer rises, drums one above the other, and everything spreads out a little.
        const layerLift = piece.layer === 'drum' ? EXPLODE_LIFT.drum * (piece.drum + 1) : piece.layer === 'base' ? 0 : EXPLODE_LIFT[piece.layer];
        const out = piece.layer === 'base' ? 1 : spread;
        position.set(piece.position.x * out, piece.position.y + layerLift * explode + lift, piece.position.z * out);
        scale.copy(piece.scale).multiplyScalar(visible);
        if (height !== 1) {
          scale.y *= height;
          position.y -= (piece.scale.y * (1 - height)) / 2;
        }
        matrix.compose(position, piece.quaternion, scale);
        mesh.setMatrixAt(index, matrix);

        color.setHex(piece.tint);
        if (piece.paint !== null && paint > 0) color.lerp(paintColor.setHex(piece.paint), paint);
        if (this.highlight && piece.part === this.highlight) toAccent = Math.max(toAccent, 0.5);
        if (toAccent > 0) color.lerp(accent, toAccent);
        mesh.setColorAt(index, color);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  setHighlight(part: string | null) {
    this.highlight = part as AthensPart | null;
  }

  /** The first part under the ray (pieces with no card, like the roof or the rubble, are looked through). */
  pick(raycaster: Raycaster): string | null {
    const meshes = this.sets.map((set) => set.mesh).filter((mesh): mesh is InstancedMesh => mesh !== null);
    for (const hit of raycaster.intersectObjects(meshes, false)) {
      const set = this.sets.find((candidate) => candidate.mesh === hit.object);
      const piece = set && hit.instanceId !== undefined ? set.pieces[hit.instanceId] : undefined;
      if (piece?.part) return piece.part;
    }
    return null;
  }

  get current(): AthensState {
    return this.state;
  }

  dispose() {
    for (const set of this.sets) {
      set.geometry.dispose();
      set.mesh?.dispose();
    }
    this.plaster.dispose();
    this.root.removeFromParent();
  }
}
