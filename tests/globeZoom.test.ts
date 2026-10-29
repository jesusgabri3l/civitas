import { describe, expect, it } from 'vitest';
import { clampDistance, fitDistance, settledDistance, zoomLimits } from '../src/engine/stages/globe/geo';
import { ZoomModel } from '../src/engine/stages/globe/ZoomModel';

const aspects = [0.46, 1, 1.6, 2.4];

describe('zoom limits', () => {
  it('keeps the camera outside the globe and not lost in space, at any aspect', () => {
    for (const aspect of aspects) {
      const { min, max } = zoomLimits(aspect);
      expect(min).toBeGreaterThan(1.3);
      expect(min).toBeLessThan(settledDistance(aspect));
      expect(max).toBeGreaterThan(fitDistance(aspect));
      expect(clampDistance(0.1, aspect)).toBe(min);
      expect(clampDistance(1000, aspect)).toBe(max);
      expect(clampDistance(settledDistance(aspect), aspect)).toBe(settledDistance(aspect));
    }
  });
});

describe('ZoomModel', () => {
  const limits = { min: 2, max: 5 };
  const model = (initial = 3) => new ZoomModel(initial, () => limits);

  it('never targets beyond the limits, however hard the user zooms', () => {
    const zoom = model();
    for (let i = 0; i < 100; i += 1) zoom.zoomBy(0.8);
    expect(zoom.target).toBe(limits.min);
    for (let i = 0; i < 100; i += 1) zoom.zoomBy(1.25);
    expect(zoom.target).toBe(limits.max);
  });

  it('eases towards the target without overshooting, then rests', () => {
    const zoom = model(3);
    zoom.zoomBy(0.8); // target 2.4
    let previous = zoom.distance;
    let frames = 0;
    while (zoom.update(1 / 60) && frames < 600) {
      expect(zoom.distance).toBeLessThan(previous);
      expect(zoom.distance).toBeGreaterThanOrEqual(zoom.target);
      previous = zoom.distance;
      frames += 1;
    }
    expect(frames).toBeLessThan(600);
    expect(zoom.distance).toBe(zoom.target);
    expect(zoom.update(1 / 60)).toBe(false);
  });

  it('reports a negative velocity while zooming in and none at rest', () => {
    const zoom = model(3);
    zoom.zoomBy(0.8);
    zoom.update(1 / 60);
    expect(zoom.velocity(1 / 60)).toBeLessThan(0);
    zoom.snapTo(3);
    zoom.update(1 / 60);
    expect(zoom.velocity(1 / 60)).toBe(0);
  });

  it('re-applies new limits after a resize', () => {
    let current = { min: 2, max: 5 };
    const zoom = new ZoomModel(4.5, () => current);
    current = { min: 2, max: 3.5 };
    zoom.clamp();
    expect(zoom.distance).toBe(3.5);
    expect(zoom.target).toBe(3.5);
  });
});
