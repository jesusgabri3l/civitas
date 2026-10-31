import { describe, expect, it } from 'vitest';
import type { Stage, StageHost, StageLoaders } from '../src/engine/stage/Stage';
import { StageManager } from '../src/engine/stage/StageManager';
import type { StageId } from '../src/state/appStore';
import { cities } from '../src/cities';

function fakeStage(id: StageId, log: string[]): Stage {
  const call = (name: string) => log.push(`${id}:${name}`);
  return {
    id,
    skyColor: 0,
    scene: {} as Stage['scene'],
    camera: {} as Stage['camera'],
    look: {} as Stage['look'],
    load: async () => call('load'),
    activate: () => call('activate'),
    deactivate: () => call('deactivate'),
    update: () => false,
    resize: () => {},
    sleep: () => call('sleep'),
    dispose: () => call('dispose'),
  };
}

function setup(maxWarm: number) {
  const log: string[] = [];
  const imports: string[] = [];
  const ids: StageId[] = ['globe', ...cities.map(({ id }) => id)];
  const loaders = Object.fromEntries(
    ids.map((id) => [
      id,
      async () => {
        imports.push(id);
        return { createStage: () => fakeStage(id, log) };
      },
    ]),
  ) as StageLoaders;
  const host: StageHost = { canvas: {} as HTMLCanvasElement, invalidate: () => {}, ambient: () => ({ starDensity: 1, shootingStars: false, idleSeconds: 60 }), pixelRatio: () => 1, compile: async (stage) => void log.push(`${stage.id}:warm`) };
  return { log, imports, manager: new StageManager(loaders, host, maxWarm) };
}

describe('StageManager', () => {
  it('runs load -> warm -> activate, with one dynamic import per stage', async () => {
    const { manager, log, imports } = setup(1);
    await manager.activate('rome');
    expect(log).toEqual(['rome:load', 'rome:warm', 'rome:activate']);
    expect(manager.statusOf('rome')).toBe('active');
    expect(manager.statusOf('paris')).toBe('idle');
    expect(imports).toEqual(['rome']);
  });

  it('shares concurrent preloads of the same stage', async () => {
    const { manager, log } = setup(1);
    await Promise.all([manager.preload('paris'), manager.preload('paris'), manager.activate('paris')]);
    expect(log.filter((entry) => entry === 'paris:load')).toHaveLength(1);
    expect(log.filter((entry) => entry === 'paris:warm')).toHaveLength(1);
  });

  it('keeps 1 warm stage on mobile: the oldest sleeps (GPU freed, JS kept)', async () => {
    const { manager, log } = setup(1);
    await manager.activate('globe');
    await manager.activate('rome');
    expect(manager.statusOf('globe')).toBe('warm');
    await manager.activate('paris');
    expect(manager.statusOf('rome')).toBe('warm');
    expect(manager.statusOf('globe')).toBe('asleep');
    expect(log).toContain('globe:sleep');
    expect(log).not.toContain('globe:dispose');
  });

  it('keeps 2 warm stages on desktop', async () => {
    const { manager } = setup(2);
    for (const id of ['globe', 'rome', 'paris'] as const) await manager.activate(id);
    expect(manager.statuses()).toMatchObject({ globe: 'warm', rome: 'warm', paris: 'active' });
    await manager.activate('athens');
    expect(manager.statuses()).toMatchObject({ globe: 'asleep', rome: 'warm', paris: 'warm', athens: 'active' });
  });

  it('wakes a sleeping stage without loading it again', async () => {
    const { manager, log } = setup(1);
    await manager.activate('globe');
    await manager.activate('rome');
    await manager.activate('paris');
    log.length = 0;
    await manager.activate('globe');
    expect(log).toContain('globe:warm');
    expect(log).toContain('globe:activate');
    expect(log).not.toContain('globe:load');
    expect(manager.statusOf('globe')).toBe('active');
  });

  it('never sleeps the active stage, and preloading never evicts the stage being preloaded', async () => {
    const { manager } = setup(1);
    await manager.activate('globe');
    await manager.preload('rome');
    await manager.preload('paris');
    expect(manager.statusOf('globe')).toBe('active');
    expect(manager.statusOf('paris')).toBe('warm');
    expect(manager.statusOf('rome')).toBe('asleep');
  });

  it('sleepInactive and disposeAll free everything', async () => {
    const { manager, log } = setup(2);
    await manager.activate('globe');
    await manager.activate('rome');
    manager.sleepInactive();
    expect(manager.statusOf('globe')).toBe('asleep');
    manager.disposeAll();
    expect(log).toEqual(expect.arrayContaining(['globe:dispose', 'rome:dispose']));
    expect(manager.active).toBeNull();
    expect(manager.statusOf('rome')).toBe('idle');
  });
});
