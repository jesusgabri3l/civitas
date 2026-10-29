export type QualityTier = 'low' | 'medium' | 'high';

export interface QualitySettings {
  tier: QualityTier;
  maxPixelRatio: number;
  renderScale: number;
  msaaSamples: number;
  /** false: no G-buffer pass; AO reads the depth texture of the color pass. */
  useGBuffer: boolean;
  /** Warm (GPU-resident) stages kept besides the active one. */
  maxWarmStages: number;
}

export interface DeviceSignals {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  screenWidth: number;
  screenHeight: number;
  coarsePointer: boolean;
}

const MOBILE_MAX_SIDE = 820;

export function isMobileDevice(signals: DeviceSignals): boolean {
  return signals.coarsePointer || Math.min(signals.screenWidth, signals.screenHeight) <= MOBILE_MAX_SIDE;
}

export function detectQualityTier(signals: DeviceSignals): QualityTier {
  const mobile = isMobileDevice(signals);
  const memory = signals.deviceMemory ?? (mobile ? 4 : 8);
  const cores = signals.hardwareConcurrency ?? (mobile ? 6 : 8);
  if (memory <= 2 || (mobile && memory <= 3) || cores <= 2) return 'low';
  if (mobile || memory <= 4 || cores <= 4) return 'medium';
  return 'high';
}

export function settingsForTier(tier: QualityTier, mobile: boolean): QualitySettings {
  const maxPixelRatio = mobile ? 1.5 : 2;
  const maxWarmStages = mobile ? 1 : 2;
  if (tier === 'low') {
    return { tier, maxPixelRatio: Math.min(maxPixelRatio, 1), renderScale: 0.85, msaaSamples: 0, useGBuffer: false, maxWarmStages };
  }
  if (tier === 'medium') {
    return { tier, maxPixelRatio, renderScale: 1, msaaSamples: 0, useGBuffer: true, maxWarmStages };
  }
  return { tier, maxPixelRatio, renderScale: 1, msaaSamples: 4, useGBuffer: true, maxWarmStages };
}

/** How much ambient (non-interactive) animation a device can afford. */
export interface AmbientPolicy {
  /** 0..1 multiplier of the star counts. */
  starDensity: number;
  shootingStars: boolean;
  /** Seconds without interaction before ambient animation pauses (the engine then stops rendering). */
  idleSeconds: number;
}

export const MOBILE_IDLE_SECONDS = 20;
export const DESKTOP_IDLE_SECONDS = 60;

export function ambientPolicyFor(tier: QualityTier, mobile: boolean): AmbientPolicy {
  if (tier === 'low') return { starDensity: 0.35, shootingStars: false, idleSeconds: MOBILE_IDLE_SECONDS };
  if (mobile) return { starDensity: 0.45, shootingStars: false, idleSeconds: MOBILE_IDLE_SECONDS };
  return { starDensity: tier === 'medium' ? 0.8 : 1, shootingStars: true, idleSeconds: DESKTOP_IDLE_SECONDS };
}

export function lowerTier(tier: QualityTier): QualityTier {
  return tier === 'high' ? 'medium' : 'low';
}

export function readDeviceSignals(): DeviceSignals {
  return {
    deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
    screenWidth: screen.width,
    screenHeight: screen.height,
    coarsePointer: matchMedia('(pointer: coarse)').matches,
  };
}
