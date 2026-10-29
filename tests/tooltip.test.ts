import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { GLOBE_FOV, projectToScreen, rotationMatrix } from '../src/engine/stages/globe/geo';
import { formatLocalTime, isTooltipShown, placementFor } from '../src/overlay/tooltip';
import type { HotspotScreen } from '../src/state/globeStore';

const hotspot = (patch: Partial<HotspotScreen> = {}): HotspotScreen => ({ id: 'rome', x: 0.5, y: 0.5, visible: true, ...patch });

describe('placementFor (tooltip flip by quadrant)', () => {
  it('opens the label towards the middle of the screen', () => {
    expect(placementFor(0.2, 0.2)).toEqual({ horizontal: 'right', vertical: 'down' }); // top left
    expect(placementFor(0.8, 0.2)).toEqual({ horizontal: 'left', vertical: 'down' }); // top right
    expect(placementFor(0.2, 0.8)).toEqual({ horizontal: 'right', vertical: 'up' }); // bottom left
    expect(placementFor(0.8, 0.8)).toEqual({ horizontal: 'left', vertical: 'up' }); // bottom right
  });

  it('flips exactly at the middle lines', () => {
    expect(placementFor(0.4999, 0.4999)).toEqual({ horizontal: 'right', vertical: 'down' });
    expect(placementFor(0.5, 0.5)).toEqual({ horizontal: 'left', vertical: 'up' });
  });
});

describe('isTooltipShown (hidden face)', () => {
  it('shows only the open city while its point is on the visible face', () => {
    expect(isTooltipShown({ city: 'rome', pinned: false }, hotspot())).toBe(true);
    expect(isTooltipShown({ city: 'rome', pinned: true }, hotspot({ visible: false }))).toBe(false);
    expect(isTooltipShown({ city: 'paris', pinned: true }, hotspot())).toBe(false);
    expect(isTooltipShown(null, hotspot())).toBe(false);
    expect(isTooltipShown({ city: 'rome', pinned: true }, undefined)).toBe(false);
  });

  it('hides when the globe turns the point to the far side', () => {
    const camera = new PerspectiveCamera(GLOBE_FOV, 1.6, 0.1, 160);
    camera.position.set(0, 0, 3);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    const frontPoint = new Vector3(0, 0, 1);
    const open = { city: 'rome' as const, pinned: true };

    const facing = projectToScreen(frontPoint, rotationMatrix(0, 0), camera);
    expect(isTooltipShown(open, hotspot({ ...facing }))).toBe(true);

    const turnedAway = projectToScreen(frontPoint, rotationMatrix(0, Math.PI), camera);
    expect(turnedAway.visible).toBe(false);
    expect(isTooltipShown(open, hotspot({ ...turnedAway }))).toBe(false);
  });
});

describe('formatLocalTime', () => {
  it('uses the 24 hour clock of the destination time zone', () => {
    const winterNoonUtc = new Date('2026-01-15T12:00:00Z');
    expect(formatLocalTime('Europe/Athens', winterNoonUtc)).toBe('14:00');
    expect(formatLocalTime('Europe/Paris', winterNoonUtc)).toBe('13:00');
    expect(formatLocalTime('Europe/Rome', new Date('2026-07-15T21:30:00Z'))).toBe('23:30');
  });

  it('shows midnight as 00:xx, not 24:xx', () => {
    expect(formatLocalTime('Europe/Paris', new Date('2026-01-15T23:05:00Z'))).toBe('00:05');
  });
});
