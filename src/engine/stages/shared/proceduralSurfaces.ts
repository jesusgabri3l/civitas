import { CanvasTexture, LinearFilter, RepeatWrapping, SRGBColorSpace } from 'three';
import { createRandom } from '../../utils/random';

/**
 * Procedural canvas textures for the room props (reusable by the other cities): worn plaster/stone, a soft light cookie.
 * Everything is drawn once per session and shared by the cities (never disposed).
 */

/** Smooth value noise on a lattice, tileable on both axes (`cells` per side). */
function createValueNoise(cells: number, seed: number) {
  const random = createRandom(seed);
  const lattice = Float32Array.from({ length: cells * cells }, () => random());
  const at = (x: number, y: number) => lattice[(((y % cells) + cells) % cells) * cells + (((x % cells) + cells) % cells)];
  const fade = (t: number) => t * t * (3 - 2 * t);
  return (u: number, v: number) => {
    const x = u * cells;
    const y = v * cells;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = fade(x - x0);
    const ty = fade(y - y0);
    const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
    const bottom = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
    return top * (1 - ty) + bottom * ty;
  };
}

export interface StoneTextures {
  map: CanvasTexture;
  roughnessMap: CanvasTexture;
  bumpMap: CanvasTexture;
}

/** The grayscale in the color map peaks at this (a tone above 1 would clip in 8 bits); the material color gets it back. */
export const STONE_TONE_PEAK = 1.2;

const STONE_SEED = 41;
const STONE_SIZE = { width: 1024, height: 256 } as const;
const clamp255 = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 255);

/** One canvas whose pixels the caller writes straight into `data` (RGBA). */
function createSurface(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;
  return { canvas, context, image: context.createImageData(width, height) };
}

/**
 * Worn stone/plaster in grayscale: low-amplitude mottling in tone and roughness, faint veins, a few chips. The color map is a tone
 * (sRGB, 1.0 = `STONE_TONE_PEAK`/1.2 of white) that each city tints with `material.color`; the other two are linear data.
 */
function createStoneTextures(): StoneTextures {
  const { width, height } = STONE_SIZE;
  const broad = createValueNoise(6, STONE_SEED);
  const medium = createValueNoise(18, STONE_SEED + 1);
  const fine = createValueNoise(64, STONE_SEED + 2);
  const veinNoise = createValueNoise(5, STONE_SEED + 3);

  const [tone, rough, bump] = [0, 1, 2].map(() => createSurface(width, height));
  const toneData = tone.image.data;
  const roughData = rough.image.data;
  const bumpData = bump.image.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const v = y / height;
      const cloud = broad(u, v) * 0.5 + medium(u, v) * 0.3 + fine(u, v) * 0.2;
      // Veins: thin dark bands where a low-frequency field crosses 0.5.
      const vein = Math.max(0, 1 - Math.abs(veinNoise(u, v * 0.6 + 0.3) - 0.5) * 38);
      const level = 1 + (cloud - 0.5) * 0.16 - vein * 0.07 + (fine(u * 2, v * 2) - 0.5) * 0.05;
      const index = (y * width + x) * 4;
      const gray = clamp255((level / STONE_TONE_PEAK) ** (1 / 2.2));
      toneData[index] = toneData[index + 1] = toneData[index + 2] = gray;
      toneData[index + 3] = 255;
      roughData[index] = roughData[index + 2] = 0;
      roughData[index + 1] = clamp255(0.82 + (medium(u + 0.31, v) - 0.5) * 0.3 - vein * 0.1);
      roughData[index + 3] = 255;
      const bumpValue = clamp255(0.5 + (fine(u, v) - 0.5) * 0.5 + (medium(u, v) - 0.5) * 0.3 - vein * 0.12);
      bumpData[index] = bumpData[index + 1] = bumpData[index + 2] = bumpValue;
      bumpData[index + 3] = 255;
    }
  }

  const [map, roughnessMap, bumpMap] = [tone, rough, bump].map(({ canvas, context, image }, kind) => {
    context.putImageData(image, 0, 0);
    const texture = new CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(8, 1);
    texture.minFilter = LinearFilter;
    texture.anisotropy = 4;
    if (kind === 0) texture.colorSpace = SRGBColorSpace;
    return texture;
  });
  // Shared by every city: a stage going to sleep must not free them (`disposeObject` skips what is marked).
  for (const texture of [map, roughnessMap, bumpMap]) texture.userData.shared = true;
  return { map, roughnessMap, bumpMap };
}

let sharedStone: StoneTextures | null = null;
let sharedCookie: CanvasTexture | null = null;

/** The stone every city's pedestal shares (built once, kept for the session: nobody disposes it). */
export function getStoneTextures(): StoneTextures {
  return (sharedStone ??= createStoneTextures());
}

/** The spot cookie every city shares (built once, kept for the session). */
export function getSoftPoolCookie(): CanvasTexture {
  return (sharedCookie ??= createSoftPoolCookie(STONE_SEED + 5));
}

/** Builds both while the globe is on screen, so entering a city finds them ready. */
export function warmProceduralSurfaces() {
  // One long task per texture instead of both in a row: each runs in its own idle slot.
  const steps = [getStoneTextures, getSoftPoolCookie];
  const runNext = () => {
    steps.shift()?.();
    if (steps.length) schedule();
  };
  const schedule = () => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(runNext, { timeout: 4000 });
    else setTimeout(runNext, 1500);
  };
  schedule();
}

/**
 * Light cookie for a spot: a soft pool whose edge wobbles (low-frequency noise on the radius) and whose center falls off smoothly,
 * so the floor patch reads as gallery light instead of a clean ellipse. 0 outside, 1 at the heart (grayscale, multiplied by the light).
 */
function createSoftPoolCookie(seed: number, size = 256): CanvasTexture {
  const noise = createValueNoise(4, seed);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d')!;
  const image = context.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x / (size - 1)) * 2 - 1;
      const dy = (y / (size - 1)) * 2 - 1;
      const angle = Math.atan2(dy, dx);
      // Radius wobbles along the angle: sampling the noise on a circle keeps it seamless.
      const wobble = noise(Math.cos(angle) * 0.5 + 0.5, Math.sin(angle) * 0.5 + 0.5);
      const edge = 1 + (wobble - 0.5) * 0.2;
      const r = Math.hypot(dx, dy) / edge;
      const t = Math.min(1, Math.max(0, 1 - r));
      const level = t * t * (3 - 2 * t);
      // Falls all the way to 0 at the rim: no floor level, so the pool has no visible ring.
      const value = Math.round(level * 255);
      const index = (y * size + x) * 4;
      image.data[index] = image.data[index + 1] = image.data[index + 2] = value;
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.userData.shared = true;
  return texture;
}
