import { describe, expect, it } from 'vitest';
import { PerformanceMonitor, QualityGovernor } from '../src/engine/quality/PerformanceMonitor';
import { detectQualityTier, settingsForTier, type DeviceSignals } from '../src/engine/quality/qualityTier';

const desktop: DeviceSignals = { deviceMemory: 8, hardwareConcurrency: 12, screenWidth: 1920, screenHeight: 1080, coarsePointer: false };
const phone: DeviceSignals = { deviceMemory: 8, hardwareConcurrency: 8, screenWidth: 390, screenHeight: 844, coarsePointer: true };

describe('quality tiers', () => {
  it('detects tiers from device signals', () => {
    expect(detectQualityTier(desktop)).toBe('high');
    expect(detectQualityTier({ ...desktop, deviceMemory: 4 })).toBe('medium');
    expect(detectQualityTier(phone)).toBe('medium');
    expect(detectQualityTier({ ...phone, deviceMemory: 2 })).toBe('low');
  });

  it('caps DPR at 1.5 on mobile, keeps 1 warm stage, and drops the G-buffer on low', () => {
    expect(settingsForTier('high', true).maxPixelRatio).toBe(1.5);
    expect(settingsForTier('high', true).maxWarmStages).toBe(1);
    expect(settingsForTier('high', false).maxWarmStages).toBe(2);
    expect(settingsForTier('low', false).useGBuffer).toBe(false);
    expect(settingsForTier('medium', false).useGBuffer).toBe(true);
  });
});

describe('PerformanceMonitor / QualityGovernor', () => {
  it('measures fps over a continuous run and ignores idle gaps', () => {
    const monitor = new PerformanceMonitor();
    let snapshot = null;
    for (let t = 0; t <= 600 && !snapshot; t += 20) snapshot = monitor.recordFrame(1000 + t);
    expect(snapshot?.fps).toBeCloseTo(50, 0);
    expect(monitor.recordFrame(5000)).toBeNull();
    expect(monitor.recordFrame(5016)).toBeNull();
  });

  it('downgrades only after sustained slow windows', () => {
    const governor = new QualityGovernor(30, 3);
    const slow = { fps: 20, frameMs: 50 };
    expect(governor.shouldDowngrade(slow)).toBe(false);
    expect(governor.shouldDowngrade({ fps: 60, frameMs: 16 })).toBe(false);
    expect(governor.shouldDowngrade(slow)).toBe(false);
    expect(governor.shouldDowngrade(slow)).toBe(false);
    expect(governor.shouldDowngrade(slow)).toBe(true);
  });
});
