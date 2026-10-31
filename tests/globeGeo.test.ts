import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { cities } from '../src/cities';
import {
  EUROPE,
  GLOBE_FOV,
  MIN_HOTSPOT_SEPARATION_PX,
  fitDistance,
  formatCoordinates,
  latLonToVector3,
  orientationFor,
  projectToScreen,
  rotationMatrix,
  settledDistance,
  viewCenter,
  wrapLongitude,
} from '../src/engine/stages/globe/geo';
import { coastlines, decodeLand, segmentsFromPolylines } from '../src/engine/stages/globe/landData';

const close = (a: Vector3, b: [number, number, number]) => {
  expect(a.x).toBeCloseTo(b[0], 6);
  expect(a.y).toBeCloseTo(b[1], 6);
  expect(a.z).toBeCloseTo(b[2], 6);
};

describe('latLonToVector3', () => {
  it('maps the cardinal points of the sphere', () => {
    close(latLonToVector3(0, 0), [0, 0, 1]);
    close(latLonToVector3(0, 90), [1, 0, 0]);
    close(latLonToVector3(0, -90), [-1, 0, 0]);
    close(latLonToVector3(0, 180), [0, 0, -1]);
    close(latLonToVector3(90, 33), [0, 1, 0]);
    close(latLonToVector3(-90, 0), [0, -1, 0]);
  });

  it('always lands on the sphere of the requested radius', () => {
    for (const [lat, lon] of [[37.97, 23.72], [-33.9, 151.2], [64.1, -21.9]]) {
      expect(latLonToVector3(lat, lon, 2.5).length()).toBeCloseTo(2.5, 6);
    }
  });
});

describe('orientation', () => {
  const camera = new PerspectiveCamera(GLOBE_FOV, 1, 0.1, 40);
  camera.position.set(0, 0, 4);
  camera.updateMatrixWorld(true);

  it('puts the target lat/lon at the center of the screen', () => {
    const { tilt, yaw } = orientationFor(EUROPE);
    const center = projectToScreen(latLonToVector3(EUROPE.lat, EUROPE.lon), rotationMatrix(tilt, yaw), camera);
    expect(center.x).toBeCloseTo(0.5, 6);
    expect(center.y).toBeCloseTo(0.5, 6);
    expect(center.visible).toBe(true);
  });

  it('hides points on the far side of the globe', () => {
    const { tilt, yaw } = orientationFor(EUROPE);
    const farSide = projectToScreen(latLonToVector3(-EUROPE.lat, EUROPE.lon + 180), rotationMatrix(tilt, yaw), camera);
    expect(farSide.visible).toBe(false);
  });
});

describe('hotspots at the settled Europe framing', () => {
  const viewports = [
    [360, 640],
    [390, 844],
    [768, 1024],
    [1000, 640],
    [1440, 900],
    [1920, 1080],
  ];

  it.each(viewports)('are visible and at least a touch target apart on %ix%i', (width, height) => {
    const aspect = width / height;
    const camera = new PerspectiveCamera(GLOBE_FOV, aspect, 0.1, 40);
    camera.position.set(0, 0, settledDistance(aspect));
    camera.updateMatrixWorld(true);
    const { tilt, yaw } = orientationFor(EUROPE);
    const rotation = rotationMatrix(tilt, yaw);

    const screens = cities.map(({ id, coordinates }) => ({
      id,
      ...projectToScreen(latLonToVector3(coordinates.lat, coordinates.lon), rotation, camera),
    }));
    screens.forEach((screen) => expect(screen.visible, `${screen.id} visible`).toBe(true));
    for (let i = 0; i < screens.length; i += 1) {
      for (let j = i + 1; j < screens.length; j += 1) {
        const distance = Math.hypot((screens[i].x - screens[j].x) * width, (screens[i].y - screens[j].y) * height);
        expect(distance, `${screens[i].id} vs ${screens[j].id}`).toBeGreaterThanOrEqual(MIN_HOTSPOT_SEPARATION_PX);
      }
    }
  });

  it('is closer than the whole-globe framing', () => {
    for (const [width, height] of viewports) {
      expect(settledDistance(width / height)).toBeLessThan(fitDistance(width / height));
    }
  });
});

describe('land asset', () => {
  it('decodes delta-encoded polylines into lon/lat degrees', () => {
    expect(decodeLand({ scale: 10, lines: [[10, 20, 5, -5, 5, 5]] })).toEqual([[[1, 2], [1.5, 1.5], [2, 2]]]);
  });

  it('ships real coastlines inside valid ranges', () => {
    const lines = coastlines();
    expect(lines.length).toBeGreaterThan(50);
    for (const line of lines) {
      for (const [lon, lat] of line) {
        expect(Math.abs(lon)).toBeLessThanOrEqual(180);
        expect(Math.abs(lat)).toBeLessThanOrEqual(90);
      }
    }
  });

  it('builds sphere-hugging segments (pairs of vertices on the radius)', () => {
    const positions = segmentsFromPolylines(coastlines(), 1.004);
    expect(positions.length % 6).toBe(0);
    for (let i = 0; i < positions.length; i += 3) {
      expect(Math.hypot(positions[i], positions[i + 1], positions[i + 2])).toBeCloseTo(1.004, 3);
    }
  });
});

describe('view center and coordinates', () => {
  it('formats with one decimal and hemisphere letters', () => {
    expect(formatCoordinates(48.8584, 2.2945)).toBe('48.9°N 2.3°E');
    expect(formatCoordinates(48.84, 2.31)).toBe('48.8°N 2.3°E');
    expect(formatCoordinates(-33.87, 151.21)).toBe('33.9°S 151.2°E');
    expect(formatCoordinates(40.71, -74.01)).toBe('40.7°N 74.0°W');
    expect(formatCoordinates(0, 0)).toBe('0.0°N 0.0°E');
  });

  it('never prints a negative zero or a hemisphere for a rounded zero', () => {
    expect(formatCoordinates(-0.04, -0.04)).toBe('0.0°N 0.0°E');
  });

  it('wraps longitude into (-180, 180]', () => {
    expect(wrapLongitude(190)).toBe(-170);
    expect(wrapLongitude(-190)).toBe(170);
    expect(wrapLongitude(180)).toBe(180);
    expect(wrapLongitude(-180)).toBe(180);
    expect(wrapLongitude(725)).toBe(5);
    expect(formatCoordinates(10, 190)).toBe('10.0°N 170.0°W');
  });

  it('reads the Europe framing back as Europe', () => {
    const { tilt, yaw } = orientationFor(EUROPE);
    const center = viewCenter(tilt, yaw);
    expect(center.lat).toBeCloseTo(EUROPE.lat, 6);
    expect(center.lon).toBeCloseTo(EUROPE.lon, 6);
    expect(formatCoordinates(center.lat, center.lon)).toBe('43.0°N 13.0°E');
  });

  it('agrees with the projection: the center point faces the camera dead ahead', () => {
    const camera = new PerspectiveCamera(GLOBE_FOV, 1.6, 0.1, 160);
    camera.position.set(0, 0, 3);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    for (const yaw of [-2.5, -0.4, 0, 1.3, 3]) {
      const { tilt } = orientationFor(EUROPE);
      const center = viewCenter(tilt, yaw);
      const point = latLonToVector3(center.lat, center.lon);
      const screen = projectToScreen(point, rotationMatrix(tilt, yaw), camera);
      expect(screen.x).toBeCloseTo(0.5, 5);
      expect(screen.y).toBeCloseTo(0.5, 5);
      expect(screen.visible).toBe(true);
    }
  });
});
