import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Vector3,
} from 'three';
import { SKY_LAYER } from '../../../engine/render/LookPipeline';
import { ACCENT, BASE_Y, DRAWING, type ParisState } from './parisConfig';
import type { Piece } from './EiffelTower';

/** A bar is drawn as one stroke along its longest axis (bars run along local Y); a platform as the outline of its top. */
const STROKES: [Vector3, Vector3][] = [
  [new Vector3(-0.5, 0, 0), new Vector3(0.5, 0, 0)],
  [new Vector3(0, -0.5, 0), new Vector3(0, 0.5, 0)],
  [new Vector3(0, 0, -0.5), new Vector3(0, 0, 0.5)],
];
const TOP = [[-0.5, 0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]].map(([x, y, z]) => new Vector3(x, y, z));
const TOP_EDGES = [[0, 1], [1, 2], [2, 3], [3, 0]] as const;

const ink = new Color(DRAWING.ink);
const gold = new Color(ACCENT);
const lineColor = new Color();

/** One set of lines (the front half of the tower, or the back half): real positions and the elevation on the sheet. */
class LineSet {
  readonly lines: LineSegments<BufferGeometry, LineBasicMaterial>;
  private readonly real: Float32Array;
  private readonly flat: Float32Array;
  private depth = -1;

  constructor(real: number[], yaw: number) {
    this.real = new Float32Array(real);
    // The elevation: the tower seen straight from its front (depth dropped), turned to lie on the sheet that faces the viewer.
    this.flat = new Float32Array(real.length);
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    for (let i = 0; i < real.length; i += 3) {
      const x = this.real[i];
      this.flat[i] = x * cos;
      this.flat[i + 1] = this.real[i + 1];
      this.flat[i + 2] = -x * sin;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.flat.slice(), 3));
    this.lines = new LineSegments(geometry, new LineBasicMaterial({ color: DRAWING.ink, transparent: true, toneMapped: false, fog: false }));
    this.lines.layers.set(SKY_LAYER);
    this.lines.frustumCulled = false;
  }

  /** Lines drawn (share, bottom-up), how deep they are (0 flat, 1 real) and their color and opacity. */
  set(draw: number, depth: number, color: Color, opacity: number) {
    const attribute = this.lines.geometry.getAttribute('position') as Float32BufferAttribute;
    const segments = attribute.count / 2;
    this.lines.geometry.setDrawRange(0, Math.floor(segments * Math.min(1, draw)) * 2);
    this.lines.visible = draw > 0.001 && opacity > 0.01;
    this.lines.material.color.copy(color);
    this.lines.material.opacity = opacity;
    if (Math.abs(depth - this.depth) < 1e-4) return;
    this.depth = depth;
    const out = attribute.array as Float32Array;
    for (let i = 0; i < out.length; i++) out[i] = this.flat[i] + (this.real[i] - this.flat[i]) * depth;
    attribute.needsUpdate = true;
  }

  dispose() {
    this.lines.geometry.dispose();
    this.lines.material.dispose();
  }
}

/**
 * The drawing of 1884 (docs/briefs/paris.md, chapter "The drawing"): the elevation of the tower in ink on a sheet of paper. In the
 * construction chapter the sheet rolls away and the drawing takes depth and turns champagne: the lines become the tower the iron
 * rises over. Built once from the bars of the maquette (their edges), ordered from the ground up so it is drawn as the tower rose.
 */
export class EiffelDrawing {
  readonly root = new Group();
  private readonly front: LineSet;
  private readonly back: LineSet;
  private readonly sheet = new Group();
  private readonly paperMaterial = new MeshBasicMaterial({ color: DRAWING.paper, transparent: true, toneMapped: false, fog: false });
  private readonly gridMaterial = new LineBasicMaterial({ color: DRAWING.grid, transparent: true, toneMapped: false, fog: false });

  constructor(pieces: Piece[]) {
    this.root.name = 'eiffel-drawing';
    const normal = new Vector3(DRAWING.facing[0], 0, DRAWING.facing[2]).normalize();
    const yaw = Math.atan2(normal.x, normal.z);
    const front: number[] = [];
    const back: number[] = [];
    const matrix = new Matrix4();
    const point = new Vector3();
    const push = (target: number[], from: Vector3, to: Vector3) => {
      point.copy(from).applyMatrix4(matrix);
      target.push(point.x, point.y, point.z);
      point.copy(to).applyMatrix4(matrix);
      target.push(point.x, point.y, point.z);
    };
    for (const piece of [...pieces].sort((a, b) => a.position.y - b.position.y)) {
      matrix.compose(piece.position, piece.quaternion, piece.scale);
      // Front half: the face the elevation shows (+Z) and the side faces, which fall on the outline of the drawing.
      const target = piece.position.z >= -1 ? front : back;
      const { x, y, z } = piece.scale;
      const isPlatform = y < Math.min(x, z) && Math.min(x, z) > 4;
      if (isPlatform) for (const [a, b] of TOP_EDGES) push(target, TOP[a], TOP[b]);
      else push(target, ...STROKES[x >= y && x >= z ? 0 : z >= y ? 2 : 1]);
    }
    this.front = new LineSet(front, yaw);
    this.back = new LineSet(back, yaw);
    this.buildSheet(normal);
    this.root.add(this.sheet, this.front.lines, this.back.lines);
  }

  /** The sheet: paper with a faint grid, standing behind the drawing, its bottom edge on the pedestal (it unrolls upward). */
  private buildSheet(normal: Vector3) {
    const { width, height, offset } = DRAWING;
    const paper = new Mesh(new PlaneGeometry(width, height).translate(0, height / 2, 0), this.paperMaterial);
    const points: number[] = [];
    const step = 20;
    for (let x = -width / 2 + step; x < width / 2; x += step) points.push(x, 0, 0.3, x, height, 0.3);
    for (let y = step; y < height; y += step) points.push(-width / 2, y, 0.3, width / 2, y, 0.3);
    const gridGeometry = new BufferGeometry();
    gridGeometry.setAttribute('position', new Float32BufferAttribute(points, 3));
    const grid = new LineSegments(gridGeometry, this.gridMaterial);
    this.sheet.add(paper, grid);
    this.sheet.position.copy(normal).multiplyScalar(-offset).setY(BASE_Y + 0.5);
    this.sheet.rotation.y = Math.atan2(normal.x, normal.z);
    this.sheet.traverse((object) => object.layers.set(SKY_LAYER));
  }

  setState(state: ParisState) {
    const { draw, paper, depth } = state;
    // Ink while it lies flat on the paper; champagne as it takes depth (the drawing over the night).
    lineColor.copy(ink).lerp(gold, Math.min(1, depth * 2));
    this.front.set(draw, depth, lineColor, 0.9);
    // The far half overlaps the near one in the elevation: it only shows as the drawing takes depth.
    this.back.set(draw, depth, lineColor, 0.9 * depth);

    this.sheet.visible = paper > 0.005;
    this.sheet.scale.set(1, Math.max(0.001, paper), 1);
    this.paperMaterial.opacity = Math.min(1, paper * 1.5);
    this.gridMaterial.opacity = Math.min(1, paper * 1.5);
  }

  dispose() {
    this.front.dispose();
    this.back.dispose();
    this.sheet.traverse((object) => {
      if (object instanceof Mesh || object instanceof LineSegments) object.geometry.dispose();
    });
    this.paperMaterial.dispose();
    this.gridMaterial.dispose();
    this.root.removeFromParent();
  }
}
