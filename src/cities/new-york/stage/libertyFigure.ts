// The sculpted figure of the Statue of Liberty (public/models/liberty.glb): flattening it, sharing its triangles out into layers and measuring them for the section.
// Pure math over arrays and `three` only (no project imports), so `scripts/check-liberty-glb.mjs` can run it in Node with no browser.
import { Matrix3, type BufferGeometry, type Matrix4, type Mesh, type Object3D } from 'three';

/** Parts of the figure that can be lit by hand in Explore (`skin` is everything else); the order is the id stored per vertex. */
export const PART_NAMES = ['skin', 'crown', 'tablet', 'torch'] as const;

/** Positions and normals of the whole figure, three vertices per triangle, in the space of the scene. */
export interface FlatFigure {
  positions: Float32Array;
  normals: Float32Array;
}

/** Joins every mesh under `root` into one non-indexed set of triangles (what the cells are cut from). */
export function flattenScene(root: Object3D): FlatFigure {
  root.updateMatrixWorld(true);
  const parts: { geometry: BufferGeometry; matrix: Matrix4 }[] = [];
  let total = 0;
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const source = mesh.geometry as BufferGeometry;
    const geometry = source.index ? source.toNonIndexed() : source;
    if (!geometry.getAttribute('normal')) throw new Error('liberty.glb: the mesh has no normals');
    parts.push({ geometry, matrix: mesh.matrixWorld });
    total += geometry.getAttribute('position').count;
  });
  if (total === 0 || total % 3 !== 0) throw new Error('liberty.glb: no triangles found');
  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);
  const normalMatrix = new Matrix3();
  let at = 0;
  for (const { geometry, matrix } of parts) {
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    normalMatrix.getNormalMatrix(matrix);
    const e = matrix.elements;
    const n = normalMatrix.elements;
    for (let index = 0; index < position.count; index++, at += 3) {
      const x = position.getX(index);
      const y = position.getY(index);
      const z = position.getZ(index);
      positions[at] = e[0] * x + e[4] * y + e[8] * z + e[12];
      positions[at + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
      positions[at + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
      const nx = normal.getX(index);
      const ny = normal.getY(index);
      const nz = normal.getZ(index);
      const tx = n[0] * nx + n[3] * ny + n[6] * nz;
      const ty = n[1] * nx + n[4] * ny + n[7] * nz;
      const tz = n[2] * nx + n[5] * ny + n[8] * nz;
      const length = Math.hypot(tx, ty, tz) || 1;
      normals[at] = tx / length;
      normals[at + 1] = ty / length;
      normals[at + 2] = tz / length;
    }
  }
  faceOutward(positions, normals);
  return { positions, normals };
}

/** The figure without the triangles whose centroid is at `fromY` or above. */
export function dropAbove(figure: FlatFigure, fromY: number): FlatFigure {
  const { positions, normals } = figure;
  const keep: number[] = [];
  for (let at = 0; at < positions.length; at += 9) {
    if ((positions[at + 1] + positions[at + 4] + positions[at + 7]) / 3 < fromY) keep.push(at);
  }
  const outPositions = new Float32Array(keep.length * 9);
  const outNormals = new Float32Array(keep.length * 9);
  keep.forEach((at, index) => {
    outPositions.set(positions.subarray(at, at + 9), index * 9);
    outNormals.set(normals.subarray(at, at + 9), index * 9);
  });
  return { positions: outPositions, normals: outNormals };
}

/**
 * Cuts every triangle that crosses a boundary between cells (the rings, the neck, the shoulder and the x cut of the arm) along it, so
 * each layer ends on a straight, clean line like a sheet trimmed for the crate, not on the ragged edge of the mesh.
 */
export function sliceStraight(figure: FlatFigure, cuts: Pick<FigureCuts, 'rings' | 'bodyTop' | 'arm'>): FlatFigure {
  const planes: [number, number][] = Array.from({ length: cuts.rings }, (_, k) => [1, ((k + 1) * cuts.bodyTop) / cuts.rings]);
  planes.push([1, cuts.arm.minY], [1, cuts.arm.splitY], [0, cuts.arm.maxX]);
  let positions = figure.positions;
  let normals = figure.normals;
  for (const [axis, value] of planes) {
    const side = (v: number) => {
      const d = v - value;
      return Math.abs(d) < 1e-6 ? 0 : d;
    };
    const crosses = (at: number) => {
      const d0 = side(positions[at + axis]);
      const d1 = side(positions[at + 3 + axis]);
      const d2 = side(positions[at + 6 + axis]);
      return Math.min(d0, d1, d2) < 0 && Math.max(d0, d1, d2) > 0;
    };
    let crossing = 0;
    for (let at = 0; at < positions.length; at += 9) if (crosses(at)) crossing++;
    // A triangle that crosses the plane becomes at most three.
    const outP = new Float32Array(positions.length + crossing * 18);
    const outN = new Float32Array(positions.length + crossing * 18);
    let out = 0;
    const push = (v: number[]) => {
      outP[out] = v[0], outP[out + 1] = v[1], outP[out + 2] = v[2];
      outN[out] = v[3], outN[out + 1] = v[4], outN[out + 2] = v[5];
      out += 3;
    };
    for (let at = 0; at < positions.length; at += 9) {
      if (!crosses(at)) {
        for (let k = 0; k < 9; k++) outP[out + k] = positions[at + k], outN[out + k] = normals[at + k];
        out += 9;
        continue;
      }
      const d = [0, 1, 2].map((c) => side(positions[at + c * 3 + axis]));
      // Sutherland-Hodgman into the polygon below and the one above, then fans (winding kept).
      const below: number[][] = [];
      const above: number[][] = [];
      const vertex = (c: number) => [0, 1, 2, 3, 4, 5].map((k) => (k < 3 ? positions[at + c * 3 + k] : normals[at + c * 3 + k - 3]));
      for (let i = 0; i < 3; i++) {
        const j = (i + 1) % 3;
        const vi = vertex(i);
        if (d[i] <= 0) below.push(vi);
        if (d[i] >= 0) above.push(vi);
        if (d[i] * d[j] < 0) {
          // From the vertex under the plane, so both triangles on the edge get the very same point (no crack).
          const [a, b, da, db] = d[i] < 0 ? [vi, vertex(j), d[i], d[j]] : [vertex(j), vi, d[j], d[i]];
          const t = -da / (db - da);
          const p = a.map((x, k) => x + t * (b[k] - x));
          p[axis] = value;
          const length = Math.hypot(p[3], p[4], p[5]) || 1;
          for (let k = 3; k < 6; k++) p[k] /= length;
          below.push(p);
          above.push(p);
        }
      }
      for (const polygon of [below, above]) {
        for (let k = 1; k + 1 < polygon.length; k++) {
          push(polygon[0]);
          push(polygon[k]);
          push(polygon[k + 1]);
        }
      }
    }
    positions = outP.subarray(0, out);
    normals = outN.subarray(0, out);
  }
  // Compact copies (the views above still hold the worst-case buffers).
  const finalPositions = positions.slice();
  const finalNormals = normals.slice();
  // A sliver of a cut can wind against its interpolated normals.
  faceOutward(finalPositions, finalNormals);
  return { positions: finalPositions, normals: finalNormals };
}

/**
 * Makes the winding of every triangle agree with its normals (swaps two corners where it does not). The ink and occlusion pass draws
 * front faces only, so a triangle that winds against its normal would be missing there and show the surface behind it.
 * Returns how many it turned.
 */
export function faceOutward(positions: number[] | Float32Array, normals: number[] | Float32Array): number {
  let turned = 0;
  for (let at = 0; at < positions.length; at += 9) {
    const ax = positions[at + 3] - positions[at];
    const ay = positions[at + 4] - positions[at + 1];
    const az = positions[at + 5] - positions[at + 2];
    const bx = positions[at + 6] - positions[at];
    const by = positions[at + 7] - positions[at + 1];
    const bz = positions[at + 8] - positions[at + 2];
    const side =
      (ay * bz - az * by) * (normals[at] + normals[at + 3] + normals[at + 6]) +
      (az * bx - ax * bz) * (normals[at + 1] + normals[at + 4] + normals[at + 7]) +
      (ax * by - ay * bx) * (normals[at + 2] + normals[at + 5] + normals[at + 8]);
    if (side >= 0) continue;
    for (let axis = 0; axis < 3; axis++) {
      for (const list of [positions, normals]) {
        const swap = list[at + 3 + axis];
        list[at + 3 + axis] = list[at + 6 + axis];
        list[at + 6 + axis] = swap;
      }
    }
    turned++;
  }
  return turned;
}

/** Where the figure is cut: layers by height (they part in the exploded view), the regions of the arm, head and hand-held parts, and the plane of the section. */
export interface FigureCuts {
  /** The body is divided in this many layers over `0..bodyTop`. */
  rings: number;
  /** Axis of the figure on the ground plane (x, z). */
  center: readonly [number, number];
  /** The section (the `skin` state) removes the half of the figure on this side of the axis: a direction on the ground plane (x, z), not necessarily unit. */
  facing: readonly [number, number];
  /** Below this the feet and the small base. */
  plinthTop: number;
  /** Above this (and not in the arm) is the head. The layers divide `0..bodyTop`. */
  bodyTop: number;
  /**
   * The raised arm and torch: from `minY` up, everything left of `maxX`, and everything above `tipY`. From `splitY` up the arm and the
   * head are separate pieces of the mesh, so there the arm is the piece that reaches `tipY` (an x cut split the forearm into the crown).
   */
  arm: { minY: number; maxX: number; tipY: number; splitY: number };
  /** Part ids: the torch from this height up in the arm, the crown from this height up in the head, the tablet in this box. */
  torchPartY: number;
  crownY: number;
  tablet: { minX: number; minY: number; maxY: number };
}

/** A set of triangles that move together in the exploded view. `layer` is `ring0..ringN`, `head` or `torch`. */
export interface CellGroup {
  layer: string;
}

export interface FigureCells {
  groups: CellGroup[];
  /** Group and part (index in `PART_NAMES`) of every vertex. */
  vertexGroup: Uint16Array;
  vertexPart: Uint8Array;
  /**
   * Depth of every triangle (its centroid) along `facing`, from the axis: positive = on the side that the section removes. A triangle
   * is gone once its depth is over the plane, which sweeps from `reach` (nothing removed) down to 0 (the whole front half).
   */
  triangleDepth: Float32Array;
  reach: number;
  /** The highest vertex: the tip of the flame. */
  tip: [number, number, number];
  /** Typical radius of the body at height `y` (median of its vertices, no arms), for the skeleton inside. */
  radiusAt(y: number): number;
  /** How far the skin is from the axis at height `y` toward `angle` (atan2(z, x)): a low percentile of the body vertices there, so iron kept inside it stays under the skin where she is narrow. */
  insideAt(y: number, angle: number): number;
}

/** Shares every triangle out to a layer by its centroid and measures its depth for the section. Throws if the figure does not look like the one the cuts expect. */
export function splitIntoCells(figure: FlatFigure, cuts: FigureCuts): FigureCells {
  const { positions } = figure;
  const count = positions.length / 3;
  const groups: CellGroup[] = [];
  const groupIndex = new Map<string, number>();
  const groupFor = (layer: string) => {
    let index = groupIndex.get(layer);
    if (index === undefined) {
      index = groups.length;
      groups.push({ layer });
      groupIndex.set(layer, index);
    }
    return index;
  };
  const vertexGroup = new Uint16Array(count);
  const vertexPart = new Uint8Array(count);
  const triangleDepth = new Float32Array(count / 3);
  const { rings, center, plinthTop, bodyTop, arm, tablet } = cuts;
  const length = Math.hypot(cuts.facing[0], cuts.facing[1]) || 1;
  const faceX = cuts.facing[0] / length;
  const faceZ = cuts.facing[1] / length;
  const body = new Uint8Array(count);
  const inArm = armPieces(positions, arm.splitY, arm.tipY);
  let reach = 0;

  for (let triangle = 0; triangle < count; triangle += 3) {
    const at = triangle * 3;
    const cx = (positions[at] + positions[at + 3] + positions[at + 6]) / 3;
    const cy = (positions[at + 1] + positions[at + 4] + positions[at + 7]) / 3;
    const cz = (positions[at + 2] + positions[at + 5] + positions[at + 8]) / 3;
    let group: number;
    let part = 0;
    let inBody = false;
    const armSide = cy >= arm.splitY ? inArm[triangle / 3] === 1 : cx < arm.maxX;
    if (cy >= arm.minY && (armSide || cy >= arm.tipY)) {
      group = groupFor('torch');
      if (cy >= cuts.torchPartY) part = 3;
    } else if (cy >= bodyTop) {
      group = groupFor('head');
      if (cy >= cuts.crownY) part = 1;
    } else if (cy < plinthTop) {
      group = groupFor('ring0');
    } else {
      group = groupFor(`ring${Math.min(rings - 1, Math.floor((cy / bodyTop) * rings))}`);
      if (cx >= tablet.minX && cy >= tablet.minY && cy <= tablet.maxY) part = 2;
      else inBody = true;
    }
    const depth = (cx - center[0]) * faceX + (cz - center[1]) * faceZ;
    triangleDepth[triangle / 3] = depth;
    if (depth > reach) reach = depth;
    for (let corner = 0; corner < 3; corner++) {
      vertexGroup[triangle + corner] = group;
      vertexPart[triangle + corner] = part;
      body[triangle + corner] = inBody ? 1 : 0;
    }
  }
  // A hair over the deepest triangle, so that at the start of the sweep nothing is removed.
  reach += 1e-3;

  let tip: [number, number, number] = [0, -Infinity, 0];
  for (let vertex = 0; vertex < count; vertex++) {
    const y = positions[vertex * 3 + 1];
    if (y > tip[1]) tip = [positions[vertex * 3], y, positions[vertex * 3 + 2]];
  }
  if (!Number.isFinite(tip[1])) throw new Error('liberty.glb: no vertices');

  // Median radius per meter of height over the body vertices (no arms, head or tablet).
  const bins: number[][] = Array.from({ length: Math.ceil(bodyTop) + 1 }, () => []);
  for (let vertex = 0; vertex < count; vertex++) {
    if (!body[vertex]) continue;
    const bin = Math.round(positions[vertex * 3 + 1]);
    if (bin >= 0 && bin < bins.length) bins[bin].push(Math.hypot(positions[vertex * 3] - center[0], positions[vertex * 3 + 2] - center[1]));
  }
  const medians = bins.map((list) => (list.length ? list.sort((a, b) => a - b)[list.length >> 1] : 0));
  const radiusAt = (y: number) => {
    const clamped = Math.min(medians.length - 1, Math.max(0, y));
    const low = Math.floor(clamped);
    const high = Math.min(medians.length - 1, low + 1);
    const blend = clamped - low;
    const a = medians[low] || medians[high] || 3;
    const b = medians[high] || a;
    return a + (b - a) * blend;
  };

  // The same vertices in 16 sectors per meter: the near side of the skin in each direction.
  const SECTORS = 16;
  const binCount = bins.length;
  const cells: number[][] = Array.from({ length: binCount * SECTORS }, () => []);
  const sectorOf = (angle: number) => ((Math.round((angle / (Math.PI * 2)) * SECTORS) % SECTORS) + SECTORS) % SECTORS;
  for (let vertex = 0; vertex < count; vertex++) {
    if (!body[vertex]) continue;
    const bin = Math.round(positions[vertex * 3 + 1]);
    if (bin < 0 || bin >= bins.length) continue;
    const dx = positions[vertex * 3] - center[0];
    const dz = positions[vertex * 3 + 2] - center[1];
    cells[bin * SECTORS + sectorOf(Math.atan2(dz, dx))].push(Math.hypot(dx, dz));
  }
  const near = cells.map((list) => (list.length ? list.sort((a, b) => a - b)[Math.floor(list.length * 0.1)] : 0));
  const insideAt = (y: number, angle: number) => {
    const sector = sectorOf(angle);
    const bin = Math.round(Math.min(binCount - 1, Math.max(0, y)));
    // Nearest meter with skin in that direction (the small base and the neck have few vertices).
    for (let step = 0; step < binCount; step++) {
      for (const at of [bin - step, bin + step]) if (at >= 0 && at < binCount && near[at * SECTORS + sector]) return near[at * SECTORS + sector];
    }
    return radiusAt(y);
  };

  return { groups, vertexGroup, vertexPart, triangleDepth, reach, tip, radiusAt, insideAt };
}

/** Per triangle: 1 if its centroid is at `fromY` or above and it belongs to a connected piece (shared corners) that reaches `topY`. */
function armPieces(positions: Float32Array, fromY: number, topY: number): Uint8Array {
  const triangles = positions.length / 9;
  const result = new Uint8Array(triangles);
  const parent = new Int32Array(triangles).fill(-1);
  const root = (a: number) => {
    while (parent[a] !== a) a = parent[a] = parent[parent[a]];
    return a;
  };
  // Corners are matched on a grid of `step` meters (0.1 mm, coarser only if the extents would not fit one safe integer key).
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let t = 0; t < triangles; t++) {
    const at = t * 9;
    if ((positions[at + 1] + positions[at + 4] + positions[at + 7]) / 3 < fromY) continue;
    for (let c = 0; c < 9; c++) {
      const value = positions[at + c];
      const axis = c % 3;
      if (value < lo[axis]) lo[axis] = value;
      if (value > hi[axis]) hi[axis] = value;
    }
  }
  let step = 1e-4;
  const cellsOn = (axis: number) => Math.round((hi[axis] - lo[axis]) / step) + 1;
  while (cellsOn(0) * cellsOn(1) * cellsOn(2) > 2 ** 52) step *= 2;
  const ny = cellsOn(1);
  const nz = cellsOn(2);
  const corners = new Map<number, number>();
  for (let t = 0; t < triangles; t++) {
    const at = t * 9;
    if ((positions[at + 1] + positions[at + 4] + positions[at + 7]) / 3 < fromY) continue;
    parent[t] = t;
    for (let c = at; c < at + 9; c += 3) {
      const qx = Math.round((positions[c] - lo[0]) / step);
      const qy = Math.round((positions[c + 1] - lo[1]) / step);
      const qz = Math.round((positions[c + 2] - lo[2]) / step);
      const key = (qx * ny + qy) * nz + qz;
      const other = corners.get(key);
      if (other === undefined) corners.set(key, t);
      else parent[root(t)] = root(other);
    }
  }
  const top = new Map<number, number>();
  for (let t = 0; t < triangles; t++) {
    if (parent[t] < 0) continue;
    const r = root(t);
    const y = Math.max(positions[t * 9 + 1], positions[t * 9 + 4], positions[t * 9 + 7]);
    if (y > (top.get(r) ?? -Infinity)) top.set(r, y);
  }
  for (let t = 0; t < triangles; t++) if (parent[t] >= 0 && top.get(root(t))! >= topY) result[t] = 1;
  return result;
}

/**
 * Reorders the triangles from the deepest to the shallowest (positions and normals returned, the arrays of `cells` replaced), so the
 * section is just where a `drawRange` starts: the triangles removed are always the first ones.
 */
export function sortByDepth(figure: FlatFigure, cells: FigureCells): FlatFigure {
  const depth = cells.triangleDepth;
  const order = Uint32Array.from({ length: depth.length }, (_, index) => index).sort((a, b) => depth[b] - depth[a]);
  const positions = new Float32Array(figure.positions.length);
  const normals = new Float32Array(figure.normals.length);
  const vertexGroup = new Uint16Array(cells.vertexGroup.length);
  const vertexPart = new Uint8Array(cells.vertexPart.length);
  const triangleDepth = new Float32Array(depth.length);
  order.forEach((from, to) => {
    for (let k = 0; k < 9; k++) {
      positions[to * 9 + k] = figure.positions[from * 9 + k];
      normals[to * 9 + k] = figure.normals[from * 9 + k];
    }
    for (let k = 0; k < 3; k++) {
      vertexGroup[to * 3 + k] = cells.vertexGroup[from * 3 + k];
      vertexPart[to * 3 + k] = cells.vertexPart[from * 3 + k];
    }
    triangleDepth[to] = depth[from];
  });
  cells.vertexGroup = vertexGroup;
  cells.vertexPart = vertexPart;
  cells.triangleDepth = triangleDepth;
  return { positions, normals };
}
