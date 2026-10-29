import type { Vector3 } from 'three';
import land from '../../../data/globe/land110m.json';
import { DEG, arcPoints, latLonToVector3 } from './geo';

export interface LandAsset {
  scale: number;
  /** Polylines: first point absolute, then deltas, as [x0, y0, dx1, dy1, ...] in degrees * scale. */
  lines: number[][];
}

export type Polyline = Array<[number, number]>;

/** Decodes the delta-encoded asset to polylines of [lon, lat] in degrees. */
export function decodeLand({ scale, lines }: LandAsset): Polyline[] {
  return lines.map((flat) => {
    const points: Polyline = [];
    let x = 0;
    let y = 0;
    for (let i = 0; i < flat.length; i += 2) {
      x += flat[i];
      y += flat[i + 1];
      points.push([x / scale, y / scale]);
    }
    return points;
  });
}

const MAX_STEP = 3 * DEG;

/** Polylines (lon/lat degrees) to the vertex pairs of a LineSegments geometry on a sphere of the given radius. */
export function segmentsFromPolylines(polylines: Polyline[], radius: number): Float32Array {
  const values: number[] = [];
  const push = (point: Vector3) => values.push(point.x * radius, point.y * radius, point.z * radius);
  for (const line of polylines) {
    for (let i = 1; i < line.length; i += 1) {
      const from = latLonToVector3(line[i - 1][1], line[i - 1][0]);
      const to = latLonToVector3(line[i][1], line[i][0]);
      const arc = arcPoints(from, to, MAX_STEP);
      for (let j = 1; j < arc.length; j += 1) {
        push(arc[j - 1]);
        push(arc[j]);
      }
    }
  }
  return new Float32Array(values);
}

/** Meridians and parallels every `stepDegrees`, as polylines of [lon, lat]. */
export function graticule(stepDegrees: number): Polyline[] {
  const lines: Polyline[] = [];
  for (let lon = -180; lon < 180; lon += stepDegrees) {
    lines.push(Array.from({ length: 37 }, (_, i): [number, number] => [lon, -90 + i * 5]));
  }
  for (let lat = -90 + stepDegrees; lat < 90; lat += stepDegrees) {
    lines.push(Array.from({ length: 73 }, (_, i): [number, number] => [-180 + i * 5, lat]));
  }
  return lines;
}

export const coastlines = (): Polyline[] => decodeLand(land as LandAsset);
