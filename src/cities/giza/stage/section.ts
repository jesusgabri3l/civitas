import { BAND_HEIGHT, coreHalfWidth, CUT, INTERIOR, PYRAMID } from './gizaConfig';

/**
 * The north-south cut through the pyramid (plane x = `CUT.x`), as plain numbers: the stepped outline of the core minus the
 * passages and chambers. Coordinates (z south, y up), real meters. No three here, so the test can check it.
 *
 * The solid is returned as trapezoid cells between vertical lines. A polygon with holes does not work: the passages form one
 * connected network that touches the outline and branches (the plane would need a boolean union), and earcut silently drops
 * triangles when edges cross. Cells need no union: at each stretch of z the solid is the outline minus the intervals of the
 * cavities, whatever they overlap.
 */

/** A piece of the plane between two vertical edges, with straight lower and upper edges. */
export interface Trap {
  z0: number;
  z1: number;
  lo0: number;
  lo1: number;
  hi0: number;
  hi1: number;
}

/** One cell of solid: its lower and upper edges at both ends, and whether each edge is the wall of a cavity (it faces into it). */
export interface Cell {
  zl: number;
  zr: number;
  lowL: number;
  lowR: number;
  highL: number;
  highR: number;
  lowIsCavity: boolean;
  highIsCavity: boolean;
}

type Edge = (z: number) => number;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lowEdge = (p: Trap): Edge => (z) => lerp(p.lo0, p.lo1, (z - p.z0) / (p.z1 - p.z0));
const highEdge = (p: Trap): Edge => (z) => lerp(p.hi0, p.hi1, (z - p.z0) / (p.z1 - p.z0));
const flat = (z0: number, z1: number, lo: number, hi: number): Trap => ({ z0, z1, lo0: lo, lo1: lo, hi0: hi, hi1: hi });
/** A strip along a sloped line (`lo` at z0 and z1) with this vertical thickness. */
const strip = (z0: number, z1: number, lo0: number, lo1: number, thickness: number): Trap => ({ z0, z1, lo0, lo1, hi0: lo0 + thickness, hi1: lo1 + thickness });

/** Where everything inside sits in the plane (z south, y up, real meters): the passages, the gallery, the chambers. */
export function interiorPoints() {
  const { passage, descent, ascent, gallery, queen, antechamber, king, relief } = INTERIOR;
  const descentY = (z: number) => descent.entryY - descent.slope * (z - descent.entryZ);
  const junctionY = descentY(ascent.junctionZ);
  const galleryZ0 = ascent.junctionZ + ascent.run;
  const galleryY0 = junctionY + ascent.slope * ascent.run;
  const galleryZ1 = galleryZ0 + gallery.run;
  const galleryY1 = galleryY0 + ascent.slope * gallery.run;
  const queenZ0 = galleryZ0 + queen.passageRun;
  const floor = galleryY1 + antechamber.step;
  const kingZ0 = galleryZ1 + antechamber.length;
  return {
    passage,
    descentY,
    descentEndZ: descent.entryZ + (descent.entryY - descent.endY) / descent.slope,
    junction: { z: ascent.junctionZ, y: junctionY },
    gallery: { z0: galleryZ0, y0: galleryY0, z1: galleryZ1, y1: galleryY1, slope: ascent.slope },
    queen: { z0: queenZ0, z1: queenZ0 + queen.width, y0: galleryY0, wall: galleryY0 + queen.wall, ridge: galleryY0 + queen.ridge },
    king: { z0: kingZ0, z1: kingZ0 + king.width, floor, roof: floor + king.height },
    relief: { z0: kingZ0 - relief.widen, z1: kingZ0 + king.width + relief.widen, firstFloor: floor + king.height + relief.gap },
  };
}

/** Everything hollow in the plane: the passages, the gallery, the chambers, the five relieving chambers. */
export function cavities(): Trap[] {
  const { descent, gallery, antechamber } = INTERIOR;
  const point = interiorPoints();
  const { passage, junction, queen, king } = point;
  const traps: Trap[] = [
    // Descending passage, from the north face down to the base (it goes on into the rock: the underground chamber is only in the text).
    strip(descent.startZ, point.descentEndZ, point.descentY(descent.startZ), descent.endY, passage),
    // Ascending passage and Grand Gallery.
    strip(junction.z, point.gallery.z0, junction.y, point.gallery.y0, passage),
    strip(point.gallery.z0, point.gallery.z1, point.gallery.y0, point.gallery.y1, gallery.thickness),
  ];

  // Horizontal passage to the queen's chamber: walls, then a gabled ceiling in two halves.
  const queenMid = (queen.z0 + queen.z1) / 2;
  traps.push(
    flat(point.gallery.z0, queen.z0, queen.y0, queen.y0 + passage),
    flat(queen.z0, queen.z1, queen.y0, queen.wall),
    { z0: queen.z0, z1: queenMid, lo0: queen.wall, lo1: queen.wall, hi0: queen.wall, hi1: queen.ridge },
    { z0: queenMid, z1: queen.z1, lo0: queen.wall, lo1: queen.wall, hi0: queen.ridge, hi1: queen.wall },
  );

  // Antechamber and king's chamber, past the great step at the top of the gallery.
  traps.push(flat(point.gallery.z1, king.z0, king.floor, king.floor + antechamber.height), flat(king.z0, king.z1, king.floor, king.roof));

  // Five relieving chambers: flat ones, the last one with a gabled roof.
  const { relief } = INTERIOR;
  const { z0, z1 } = point.relief;
  let y = point.relief.firstFloor;
  for (let index = 0; index < 5; index++) {
    const top = y + relief.height;
    traps.push(flat(z0, z1, y, top));
    if (index === 4) {
      const mid = (z0 + z1) / 2;
      traps.push({ z0, z1: mid, lo0: top, lo1: top, hi0: top, hi1: top + relief.ridge }, { z0: mid, z1, lo0: top, lo1: top, hi0: top + relief.ridge, hi1: top });
    }
    y = top + relief.slab;
  }
  return traps;
}

/** Core bands that reach the plane, with their half width: their outline at x = `CUT.x`. */
function outline() {
  const steps: { halfWidth: number; top: number }[] = [];
  for (let band = 0; band < PYRAMID.bands; band++) {
    const halfWidth = coreHalfWidth(band);
    if (halfWidth > CUT.x) steps.push({ halfWidth, top: (band + 1) * BAND_HEIGHT });
  }
  return steps;
}

/** Height of the outline at `z` (0 outside). */
export function outlineTop(z: number): number {
  const reach = Math.abs(z);
  let top = 0;
  for (const step of outline()) if (step.halfWidth >= reach) top = step.top;
  return top;
}

const EPS = 1e-6;

/** Every z where the structure of the cells can change: vertical edges and crossings of edges. */
function events(traps: Trap[]): number[] {
  const steps = outline();
  const zs = new Set<number>();
  type Line = { z0: number; z1: number; at: Edge };
  const lines: Line[] = [];
  for (const trap of traps) {
    zs.add(trap.z0).add(trap.z1);
    lines.push({ z0: trap.z0, z1: trap.z1, at: lowEdge(trap) }, { z0: trap.z0, z1: trap.z1, at: highEdge(trap) });
  }
  steps.forEach((step, index) => {
    zs.add(step.halfWidth).add(-step.halfWidth);
    // The tread of a step: from the next narrower step to this one (the highest one reaches the middle).
    const inner = steps[index + 1]?.halfWidth ?? 0;
    for (const sign of [-1, 1]) {
      const [a, b] = sign < 0 ? [-step.halfWidth, -inner] : [inner, step.halfWidth];
      lines.push({ z0: a, z1: b, at: () => step.top });
    }
  });
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const a = lines[i];
      const b = lines[j];
      const lo = Math.max(a.z0, b.z0);
      const hi = Math.min(a.z1, b.z1);
      if (hi - lo < EPS) continue;
      // Both are straight: the crossing is where their difference changes sign.
      const dLo = a.at(lo) - b.at(lo);
      const dHi = a.at(hi) - b.at(hi);
      if (dLo * dHi < 0) zs.add(lo + ((hi - lo) * dLo) / (dLo - dHi));
    }
  }
  return [...zs].sort((a, b) => a - b).filter((z, index, all) => index === 0 || z - all[index - 1] > EPS);
}

/** The solid of the plane as trapezoid cells (the outline minus the cavities). */
export function solidCells(traps: Trap[] = cavities()): Cell[] {
  const cells: Cell[] = [];
  const zs = events(traps);
  const ground: Edge = () => 0;
  for (let index = 0; index < zs.length - 1; index++) {
    const zl = zs[index];
    const zr = zs[index + 1];
    const zm = (zl + zr) / 2;
    const top = outlineTop(zm);
    if (top <= 0) continue;
    const here = traps
      .filter((trap) => trap.z0 < zm && zm < trap.z1)
      .map((trap) => ({ lo: lowEdge(trap)(zm), hi: highEdge(trap)(zm), lowEdge: lowEdge(trap), highEdge: highEdge(trap) }))
      .sort((a, b) => a.lo - b.lo);
    const ceiling: Edge = () => top;
    const push = (from: { y: number; edge: Edge; cavity: boolean }, to: { edge: Edge; cavity: boolean }) =>
      cells.push({ zl, zr, lowL: from.edge(zl), lowR: from.edge(zr), highL: to.edge(zl), highR: to.edge(zr), lowIsCavity: from.cavity, highIsCavity: to.cavity });
    let current = { y: 0, edge: ground, cavity: false };
    for (const cavity of here) {
      if (cavity.lo >= top - EPS) break;
      if (cavity.lo > current.y + EPS) push(current, { edge: cavity.lowEdge, cavity: true });
      if (cavity.hi > current.y) current = { y: cavity.hi, edge: cavity.highEdge, cavity: true };
    }
    if (top > current.y + EPS) push(current, { edge: ceiling, cavity: false });
  }
  return cells;
}

export const cellArea = (cell: Cell) => ((cell.zr - cell.zl) * (cell.highL - cell.lowL + cell.highR - cell.lowR)) / 2;
