import { CanvasTexture, Color, LinearFilter, RepeatWrapping, SRGBColorSpace } from 'three';
import { createRandom } from '../../utils/random';

/**
 * Procedural canvas textures for the room props (reusable by the other cities): worn plaster/stone, a soft light cookie.
 * Everything is drawn once at build time; the caller owns the textures and disposes them.
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
  dispose(): void;
}

export interface StoneOptions {
  color: number;
  seed: number;
  /** Canvas size; keep the aspect of the surface so the grain is not stretched. */
  width?: number;
  height?: number;
  /** Times the texture repeats over the mapped face. */
  repeat?: [number, number];
}

/** Worn stone/plaster: low-amplitude mottling in color and roughness, faint veins, a few chips. Color map is sRGB, the other two linear data. */
export function createStoneTextures({ color, seed, width = 1024, height = 256, repeat = [8, 1] }: StoneOptions): StoneTextures {
  const broad = createValueNoise(6, seed);
  const medium = createValueNoise(18, seed + 1);
  const fine = createValueNoise(64, seed + 2);
  const veinNoise = createValueNoise(5, seed + 3);
  const base = new Color(color);

  const surfaces = [0, 1, 2].map(() => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d')!;
    return { canvas, context, image: context.createImageData(width, height) };
  });
  const [colorSurface, roughSurface, bumpSurface] = surfaces;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const v = y / height;
      const cloud = broad(u, v) * 0.5 + medium(u, v) * 0.3 + fine(u, v) * 0.2;
      // Veins: thin dark bands where a low-frequency field crosses 0.5.
      const vein = Math.max(0, 1 - Math.abs(veinNoise(u, v * 0.6 + 0.3) - 0.5) * 38);
      const tone = 1 + (cloud - 0.5) * 0.16 - vein * 0.07;
      const grain = (fine(u * 2, v * 2) - 0.5) * 0.05;
      const index = (y * width + x) * 4;
      const encode = (channel: number) => Math.round(Math.min(1, Math.max(0, (channel * (tone + grain)) ** (1 / 2.2))) * 255);
      colorSurface.image.data.set([encode(base.r), encode(base.g), encode(base.b), 255], index);
      const rough = Math.round(Math.min(1, Math.max(0, 0.82 + (medium(u + 0.31, v) - 0.5) * 0.3 - vein * 0.1)) * 255);
      roughSurface.image.data.set([0, rough, 0, 255], index);
      const bump = Math.round(Math.min(1, Math.max(0, 0.5 + (fine(u, v) - 0.5) * 0.5 + (medium(u, v) - 0.5) * 0.3 - vein * 0.12)) * 255);
      bumpSurface.image.data.set([bump, bump, bump, 255], index);
    }
  }

  const textures = surfaces.map(({ canvas, context, image }, kind) => {
    context.putImageData(image, 0, 0);
    const texture = new CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(...repeat);
    texture.minFilter = LinearFilter;
    texture.anisotropy = 4;
    if (kind === 0) texture.colorSpace = SRGBColorSpace;
    return texture;
  });
  const [map, roughnessMap, bumpMap] = textures;
  return { map, roughnessMap, bumpMap, dispose: () => textures.forEach((texture) => texture.dispose()) };
}

/**
 * Light cookie for a spot: a soft pool whose edge wobbles (low-frequency noise on the radius) and whose center falls off smoothly,
 * so the floor patch reads as gallery light instead of a clean ellipse. 0 outside, 1 at the heart (grayscale, multiplied by the light).
 */
export function createSoftPoolCookie(seed: number, size = 256): CanvasTexture {
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
      image.data.set([value, value, value, 255], (y * size + x) * 4);
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
