import { describe, expect, it } from 'vitest';
import {
  AUTO_ROTATE,
  SHOOTING_STAR_INTERVAL,
  autoRotationSpeed,
  nextShootingStarDelay,
  seededRandom,
  starCount,
} from '../src/engine/stages/globe/ambient';
import { STAR_LAYERS, StarField } from '../src/engine/stages/globe/StarField';
import {
  DESKTOP_IDLE_SECONDS,
  MOBILE_IDLE_SECONDS,
  ambientPolicyFor,
} from '../src/engine/quality/qualityTier';

describe('shooting stars', () => {
  it('come every 8 to 15 seconds', () => {
    expect(SHOOTING_STAR_INTERVAL).toEqual([8, 15]);
    expect(nextShootingStarDelay(0)).toBe(8);
    expect(nextShootingStarDelay(1)).toBe(15);
    expect(nextShootingStarDelay(0.5)).toBe(11.5);
  });
});

describe('autoRotationSpeed', () => {
  it('stays still while the user is active, then ramps up smoothly to a very slow turn', () => {
    expect(autoRotationSpeed(0)).toBe(0);
    expect(autoRotationSpeed(AUTO_ROTATE.delay)).toBe(0);
    const mid = autoRotationSpeed(AUTO_ROTATE.delay + AUTO_ROTATE.ramp / 2);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(AUTO_ROTATE.speed);
    expect(autoRotationSpeed(AUTO_ROTATE.delay + AUTO_ROTATE.ramp)).toBe(AUTO_ROTATE.speed);
    expect(autoRotationSpeed(1000)).toBe(AUTO_ROTATE.speed);
    // Slower than one degree per second: "very slow".
    expect((AUTO_ROTATE.speed * 180) / Math.PI).toBeLessThan(1);
  });
});

describe('ambient policy', () => {
  it('gives phones and the low tier fewer stars, no shooting stars and a 20 s idle pause', () => {
    for (const policy of [ambientPolicyFor('high', true), ambientPolicyFor('medium', true), ambientPolicyFor('low', false)]) {
      expect(policy.shootingStars).toBe(false);
      expect(policy.idleSeconds).toBe(MOBILE_IDLE_SECONDS);
      expect(policy.starDensity).toBeLessThan(0.5);
    }
    expect(MOBILE_IDLE_SECONDS).toBe(20);
  });

  it('keeps the full sky on capable desktops', () => {
    const high = ambientPolicyFor('high', false);
    expect(high).toEqual({ starDensity: 1, shootingStars: true, idleSeconds: DESKTOP_IDLE_SECONDS });
    expect(ambientPolicyFor('medium', false).starDensity).toBeLessThan(high.starDensity);
  });
});

describe('starfield', () => {
  it('has three layers, one draw call each, and fewer points at lower density', () => {
    const full = new StarField(1);
    const light = new StarField(0.4);
    expect(full.layers.map((layer) => layer.name)).toEqual(['stars-dust', 'stars-stars', 'stars-bright']);
    expect(STAR_LAYERS).toHaveLength(3);
    expect(full.pointCount).toBe(STAR_LAYERS.reduce((total, layer) => total + layer.count, 0));
    expect(light.pointCount).toBeLessThan(full.pointCount * 0.5);
    expect(starCount(100, 0)).toBe(4);
    expect(starCount(100, 5)).toBe(100);
  });

  it('puts nearer layers closer so parallax moves them more', () => {
    const [dust, stars, bright] = STAR_LAYERS;
    expect(dust.depth[1]).toBeLessThanOrEqual(stars.depth[0]);
    expect(stars.depth[1]).toBeLessThanOrEqual(bright.depth[0]);
  });

  it('draws the same sky every time', () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
