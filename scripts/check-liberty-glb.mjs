// Loads public/models/liberty.glb the way the page does (GLTFLoader + meshopt) and cuts it into cells, to catch load errors without a browser.
// Run: node scripts/check-liberty-glb.mjs   (Node 22.18+ or 24: it imports the .ts directly)
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { dropAbove, flattenScene, sliceStraight, splitIntoCells, faceOutward, PART_NAMES } from '../src/cities/new-york/stage/libertyFigure.ts';
import { CUT_FACING, REST, VIEWS, stateFor, finalStateFor, figureBaseY, riseY, PEDESTAL_TOP } from '../src/cities/new-york/stage/libertyStates.ts';

const cuts = {
  rings: 8, center: [0, 0], facing: CUT_FACING, plinthTop: 2, bodyTop: 33.86 - 5.26,
  arm: { minY: 26, maxX: -2.8, tipY: 36, splitY: 30 }, torchPartY: 37, crownY: 31.8, tablet: { minX: 5.5, minY: 18, maxY: 25 },
};
const file = readFileSync(new URL('../public/models/liberty.glb', import.meta.url));
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await loader.parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '');
const flat = sliceStraight(dropAbove(flattenScene(gltf.scene), 43.4), cuts);
const cells = splitIntoCells(flat, cuts);
const triangles = flat.positions.length / 9;
const perPart = PART_NAMES.map((name, id) => `${name}=${cells.vertexPart.filter((p) => p === id).length / 3}`);
let minY = Infinity;
for (let i = 1; i < flat.positions.length; i += 3) minY = Math.min(minY, flat.positions[i]);
console.log({ triangles, groups: cells.groups.length, tip: cells.tip.map((v) => +v.toFixed(2)), minY, parts: perPart.join(' '), radius: [2, 10, 20, 27].map((y) => +cells.radiusAt(y).toFixed(2)) });
const bad = [];
// Section: skin = 0 removes nothing, skin = 1 removes the front half (depth > 0) and keeps the back one; in between the removed count only grows.
const triangleCount = cells.triangleDepth.length;
const removedAt = (skin) => cells.triangleDepth.reduce((total, depth) => total + (depth > cells.reach * (1 - skin) ? 1 : 0), 0);
const front = cells.triangleDepth.filter((depth) => depth > 0).length;
let previous = -1;
for (let step = 0; step <= 20; step++) {
  const removed = removedAt(step / 20);
  if (removed < previous) bad.push('the section gives triangles back while it advances');
  previous = removed;
}
if (removedAt(0) !== 0) bad.push('skin=0 collapses triangles');
if (removedAt(1) !== front) bad.push('skin=1 does not remove exactly the front half');
if (front < triangleCount * 0.3 || front > triangleCount * 0.7) bad.push(`the front half has ${front} of ${triangleCount} triangles: the axis looks off`);
console.log({ sectionFront: front, sectionBack: triangleCount - front, reach: +cells.reach.toFixed(2) });
const turned = faceOutward(flat.positions, flat.normals);
if (turned > 0) bad.push(`${turned} triangles still wind against their normals`);
if (cells.groups.length > 65535) bad.push('too many groups');
if (Math.abs(cells.tip[1] - 43.41) > 0.2) bad.push('tip (rim of the cup, flame dropped) is not at ~43.41 m');
if (flat.positions.some(Number.isNaN) || flat.normals.some(Number.isNaN)) bad.push('NaN in the arrays');
if (cells.vertexPart.every((p) => p === 0)) bad.push('no part regions matched');
// The crown is the head piece only: nothing of the forearm (which rises past the head, up to the torch at y = 36).
for (let v = 0; v < cells.vertexPart.length; v++) if (cells.vertexPart[v] === 1 && flat.positions[v * 3 + 1] > 35.6) { bad.push('the crown takes part of the forearm'); break; }

// States: the heels must stand on the top of the pedestal in every state, and copper must be 0 today.
const close = (a, b) => Math.abs(a - b) < 1e-9;
const keys = Object.keys(REST);
for (let chapter = 0; chapter <= 6; chapter++) {
  for (let step = 0; step <= 10; step++) {
    const t = step / 10;
    const state = stateFor(chapter, t);
    for (const key of keys) if (!(state[key] >= 0 && state[key] <= 1)) bad.push(`ch${chapter} t=${t}: ${key}=${state[key]} out of 0..1`);
    const base = figureBaseY(state.pedestal) + minY; // heels of the figure
    const top = riseY(PEDESTAL_TOP, state.pedestal); // top of the pedestal (or of the fort when it is 0)
    if (!close(base, top)) bad.push(`ch${chapter} t=${t}: figure base ${base} is not on the pedestal top ${top}`);
  }
  if (chapter < 6) {
    const end = stateFor(chapter, 1);
    const next = stateFor(chapter + 1, 0);
    for (const key of keys) if (!close(end[key], next[key])) bad.push(`ch${chapter} end -> ch${chapter + 1} start: ${key} ${end[key]} vs ${next[key]}`);
  }
}
if (stateFor(0, 0).copper !== 0 || stateFor(0, 1).copper !== 0) bad.push('copper is not 0 in the prologue');
if (stateFor(5, 1).copper !== 0) bad.push('copper is not 0 at the end of chapter 5');
if (finalStateFor(5).copper !== 0 || finalStateFor(0).copper !== 0) bad.push('reduced motion: copper is not 0 in chapters 0 and 5');
if (VIEWS.today.copper !== 0 || REST.copper !== 0) bad.push('the today view is not patina');
for (const [name, view] of Object.entries(VIEWS)) if (view.pedestal !== 1) bad.push(`view ${name} has no pedestal`);
console.log('states checked: 7 chapters x 11 steps, copper and base ok:', bad.length === 0);

if (bad.length) {
  console.error('PROBLEMS:', bad.join('; '));
  process.exit(1);
}
console.log('ok');
