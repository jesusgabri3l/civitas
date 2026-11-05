/** Seconds between shooting stars. */
export const SHOOTING_STAR_INTERVAL: [number, number] = [8, 15];

/** Delay until the next shooting star; `random` is a 0..1 sample (injectable for tests). */
export function nextShootingStarDelay(random = Math.random()): number {
  const [min, max] = SHOOTING_STAR_INTERVAL;
  return min + (max - min) * random;
}

export interface AutoRotateOptions {
  /** Radians per second at full speed. */
  speed: number;
  /** Seconds of rest before the globe starts turning again. */
  delay: number;
  /** Seconds the speed takes to ramp up once the delay has passed. */
  ramp: number;
}

export const AUTO_ROTATE: AutoRotateOptions = { speed: 0.017, delay: 5, ramp: 2 };

/** Auto-rotation speed after `restSeconds` without interaction: zero, then a smooth ramp. */
export function autoRotationSpeed(restSeconds: number, { speed, delay, ramp }: AutoRotateOptions = AUTO_ROTATE): number {
  const progress = Math.min(Math.max((restSeconds - delay) / ramp, 0), 1);
  return speed * progress * progress * (3 - 2 * progress);
}

/** Star count of a layer for a density 0..1 (never below a handful, so thin layers do not vanish). */
export function starCount(baseCount: number, density: number): number {
  return Math.max(4, Math.round(baseCount * Math.min(Math.max(density, 0), 1)));
}

/** Deterministic 0..1 generator (mulberry32), so the sky looks the same on every load. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
