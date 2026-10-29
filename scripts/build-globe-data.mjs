// Preprocesses Natural Earth 110m land (public domain, via the `world-atlas` package) into a light asset:
// integer degrees*10, delta-encoded polylines, antimeridian and pole seams removed.
//
// Usage: npm run build:globe-data  ->  src/data/globe/land110m.json
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { feature } from 'topojson-client';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const SCALE = 10;
const SEAM_EPSILON = 0.01;

const topology = JSON.parse(readFileSync(require.resolve('world-atlas/land-110m.json'), 'utf8'));
const land = feature(topology, topology.objects.land);
const geometries = land.type === 'FeatureCollection' ? land.features.map((item) => item.geometry) : [land.geometry];

const isSeam = ([lonA, latA], [lonB, latB]) =>
  (Math.abs(Math.abs(lonA) - 180) < SEAM_EPSILON && Math.abs(Math.abs(lonB) - 180) < SEAM_EPSILON) ||
  (latA < -90 + SEAM_EPSILON && latB < -90 + SEAM_EPSILON);

/** Splits a ring into runs, cutting at seam edges (the cut along +-180 and the south pole are not coastline). */
function runsOf(ring) {
  const runs = [];
  let current = [ring[0]];
  for (let i = 1; i < ring.length; i += 1) {
    if (isSeam(ring[i - 1], ring[i])) {
      if (current.length > 1) runs.push(current);
      current = [ring[i]];
    } else current.push(ring[i]);
  }
  if (current.length > 1) runs.push(current);
  return runs;
}

const quantize = ([lon, lat]) => [Math.round(lon * SCALE), Math.round(lat * SCALE)];

const polylines = [];
for (const geometry of geometries) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const run of runsOf(ring)) {
        const points = run.map(quantize).filter((point, i, all) => i === 0 || point[0] !== all[i - 1][0] || point[1] !== all[i - 1][1]);
        if (points.length > 1) polylines.push(points);
      }
    }
  }
}

const encoded = polylines.map((points) => {
  const flat = [points[0][0], points[0][1]];
  for (let i = 1; i < points.length; i += 1) flat.push(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return flat;
});

const target = join(root, 'src/data/globe/land110m.json');
writeFileSync(target, JSON.stringify({ scale: SCALE, lines: encoded }));
const points = polylines.reduce((sum, line) => sum + line.length, 0);
console.log(`${polylines.length} polylines, ${points} points, ${(statSync(target).size / 1024).toFixed(1)} KB -> ${target}`);
