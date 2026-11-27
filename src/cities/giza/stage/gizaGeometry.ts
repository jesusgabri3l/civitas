import { BufferGeometry, Float32BufferAttribute } from 'three';
import { BAND_HEIGHT, casingHalfWidth, CUT, PYRAMID } from './gizaConfig';
import { solidCells, type Cell } from './section';

type Vec3 = readonly [number, number, number];

/** Flat quads with their own vertices and normals (no shared vertices: every face keeps its own shading). */
class QuadMesh {
  readonly positions: number[] = [];
  readonly normals: number[] = [];
  readonly index: number[] = [];

  /** `a b c d` in order around the quad; the winding is fixed to face along `normal`, whatever the order given (Newell: works with a collapsed edge). */
  quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3, normal: Vec3) {
    const corners = [a, b, c, d];
    let area = 0;
    corners.forEach((p, i) => {
      const q = corners[(i + 1) % 4];
      area += (p[1] * q[2] - p[2] * q[1]) * normal[0] + (p[2] * q[0] - p[0] * q[2]) * normal[1] + (p[0] * q[1] - p[1] * q[0]) * normal[2];
    });
    const base = this.positions.length / 3;
    for (const p of corners) {
      this.positions.push(...p);
      this.normals.push(...normal);
    }
    if (area >= 0) this.index.push(base, base + 1, base + 2, base, base + 2, base + 3);
    else this.index.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }

  geometry(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new Float32BufferAttribute(this.normals, 3));
    geometry.setIndex(this.index);
    return geometry;
  }
}

/** Indices of one casing band: four faces of two triangles. */
export const CASING_INDICES_PER_BAND = 24;
/** Vertices of one casing band: four faces of four. */
export const CASING_VERTICES_PER_BAND = 16;

/**
 * The casing: the smooth skin, a frustum per band from bottom to top (the last one closes in the tip), four faces each. Bands are
 * ordered from the base up, so `setDrawRange` shows the first n of them.
 */
export function createCasingGeometry(): BufferGeometry {
  const mesh = new QuadMesh();
  const { slope } = PYRAMID;
  const out = { north: [0, Math.cos(slope), -Math.sin(slope)], south: [0, Math.cos(slope), Math.sin(slope)], east: [Math.sin(slope), Math.cos(slope), 0], west: [-Math.sin(slope), Math.cos(slope), 0] } as const;
  for (let band = 0; band < PYRAMID.bands; band++) {
    const y0 = band * BAND_HEIGHT;
    const y1 = y0 + BAND_HEIGHT;
    const wb = casingHalfWidth(y0);
    const wt = Math.max(0, casingHalfWidth(y1));
    mesh.quad([-wb, y0, -wb], [wb, y0, -wb], [wt, y1, -wt], [-wt, y1, -wt], out.north);
    mesh.quad([wb, y0, wb], [-wb, y0, wb], [-wt, y1, wt], [wt, y1, wt], out.south);
    mesh.quad([wb, y0, -wb], [wb, y0, wb], [wt, y1, wt], [wt, y1, -wt], out.east);
    mesh.quad([-wb, y0, wb], [-wb, y0, -wb], [-wt, y1, -wt], [-wt, y1, wt], out.west);
  }
  const geometry = mesh.geometry();
  geometry.setAttribute('color', new Float32BufferAttribute(new Array(mesh.positions.length).fill(1), 3));
  return geometry;
}

/**
 * The cut face: the slab of the core between `CUT.x - CUT.depth` and the plane, with the passages as niches (the half that stays
 * ends where the slab starts, so every hollow has a back). Built from the cells of `section.ts`: front face, the walls of the
 * niches, the treads and the risers of the outline. The back is not drawn (the other half is there).
 */
export function createCutFaceGeometry(cells: Cell[] = solidCells()): BufferGeometry {
  const mesh = new QuadMesh();
  const front = CUT.x;
  const back = CUT.x - CUT.depth;
  for (const cell of cells) {
    const { zl, zr, lowL, lowR, highL, highR } = cell;
    mesh.quad([front, lowL, zl], [front, lowR, zr], [front, highR, zr], [front, highL, zl], [1, 0, 0]);
    const run = zr - zl;
    const climb = (to: number, from: number) => (to - from) / run;
    const upNormal = (m: number): Vec3 => {
      const length = Math.hypot(1, m);
      return [0, 1 / length, -m / length];
    };
    // Upper edge: a tread of the outline or the floor of a niche (always faces up).
    mesh.quad([back, highL, zl], [front, highL, zl], [front, highR, zr], [back, highR, zr], upNormal(climb(highR, highL)));
    // Lower edge: the ceiling of a niche (faces down); the base is hidden by the pedestal.
    if (cell.lowIsCavity) {
      const [nx, ny, nz] = upNormal(climb(lowR, lowL));
      mesh.quad([back, lowL, zl], [back, lowR, zr], [front, lowR, zr], [front, lowL, zl], [nx, -ny, -nz]);
    }
    if (highL - lowL > 1e-6) mesh.quad([back, lowL, zl], [front, lowL, zl], [front, highL, zl], [back, highL, zl], [0, 0, -1]);
    if (highR - lowR > 1e-6) mesh.quad([back, lowR, zr], [front, lowR, zr], [front, highR, zr], [back, highR, zr], [0, 0, 1]);
  }
  return mesh.geometry();
}
