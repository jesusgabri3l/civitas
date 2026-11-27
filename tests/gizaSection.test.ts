import { describe, expect, it } from 'vitest';
import { cavities, cellArea, outlineTop, solidCells } from '../src/cities/giza/stage/section';

// The cells are the outline minus the cavities: compare their area with a grid of points inside the outline and outside every cavity.
describe('giza cut face', () => {
  const traps = cavities();
  const cells = solidCells(traps);

  const inCavity = (z: number, y: number) =>
    traps.some((trap) => {
      if (z < trap.z0 || z > trap.z1) return false;
      const t = (z - trap.z0) / (trap.z1 - trap.z0);
      return y >= trap.lo0 + (trap.lo1 - trap.lo0) * t && y <= trap.hi0 + (trap.hi1 - trap.hi0) * t;
    });

  it('covers the outline minus the passages, with no overlap', () => {
    const step = 0.2;
    let sampled = 0;
    for (let z = -115; z < 115; z += step) {
      const top = outlineTop(z + step / 2);
      for (let y = step / 2; y < top; y += step) if (!inCavity(z + step / 2, y)) sampled += step * step;
    }
    const total = cells.reduce((sum, cell) => sum + cellArea(cell), 0);
    expect(Math.abs(total - sampled) / sampled).toBeLessThan(0.005);
  });

  it('keeps every cell well formed', () => {
    for (const cell of cells) {
      expect(cell.zr).toBeGreaterThan(cell.zl);
      expect(cell.highL).toBeGreaterThanOrEqual(cell.lowL - 1e-6);
      expect(cell.highR).toBeGreaterThanOrEqual(cell.lowR - 1e-6);
    }
  });

  it('opens the entrance in the north face and the gallery inside', () => {
    expect(cells.length).toBeGreaterThan(100);
    expect(inCavity(-98, 14)).toBe(true);
    expect(inCavity(-20, 35)).toBe(true);
    expect(inCavity(-20, 60)).toBe(false);
  });
});
