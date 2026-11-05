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
    expect(settingsForTier('medium', false).msaaSamples).toBe(2);
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

  it('reads long frames of a continuous run as slow, not idle', () => {
    const monitor = new PerformanceMonitor();
    monitor.recordFrame(1000, true);
    const snapshot = monitor.recordFrame(1600, true);
    expect(snapshot?.fps).toBeCloseTo(1.7, 1);
    expect(monitor.recordFrame(5000, true)).toBeNull(); // a hidden tab still resets
  });

  it('goes straight to the floor when the device crawls', () => {
    const governor = new QualityGovernor(30, 3, 55, 4);
    const crawl = { fps: 2, frameMs: 600 };
    governor.judge(crawl);
    governor.judge(crawl);
    expect(governor.judge(crawl)).toBe('floor');
  });

  it('downgrades only after sustained slow windows', () => {
    const governor = new QualityGovernor(30, 3, 55, 4);
    const slow = { fps: 20, frameMs: 50 };
    expect(governor.judge(slow)).toBeNull();
    expect(governor.judge({ fps: 45, frameMs: 22 })).toBeNull();
    expect(governor.judge(slow)).toBeNull();
    expect(governor.judge(slow)).toBeNull();
    expect(governor.judge(slow)).toBe('down');
  });

  it('asks to climb back after sustained fast windows', () => {
    const governor = new QualityGovernor(30, 3, 55, 4);
    const fast = { fps: 60, frameMs: 16 };
    for (let i = 0; i < 3; i++) expect(governor.judge(fast)).toBeNull();
    expect(governor.judge(fast)).toBe('up');
    expect(governor.judge(fast)).toBeNull();
  });
});
