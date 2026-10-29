import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  $ambientActive,
  $hasInteracted,
  $hotspots,
  $viewCenter,
  markInteracted,
  setAmbientActive,
  setViewCenter,
  $openTooltip,
  bindPreload,
  hideTooltip,
  requestPreload,
  resetGlobeStoreForTests,
  scheduleHideTooltip,
  setHotspots,
  showTooltip,
} from '../src/state/globeStore';

let preload: ReturnType<typeof vi.fn>;
let unbind: () => void;

beforeEach(() => {
  resetGlobeStoreForTests();
  preload = vi.fn(async () => undefined);
  unbind = bindPreload(preload);
});

afterEach(() => {
  unbind();
  vi.useRealTimers();
});

describe('preload on tooltip open', () => {
  it('does nothing until a tooltip opens', () => {
    expect(preload).not.toHaveBeenCalled();
  });

  it('warms the stage of the city whose tooltip opens', () => {
    showTooltip('rome', false);
    expect(preload).toHaveBeenCalledTimes(1);
    expect(preload).toHaveBeenCalledWith('rome');
    expect($openTooltip.get()).toEqual({ city: 'rome', pinned: false });
  });

  it('follows the tooltip from city to city', () => {
    showTooltip('rome', false);
    showTooltip('paris', true);
    expect(preload.mock.calls.map(([city]) => city)).toEqual(['rome', 'paris']);
  });

  it('asks again when the same tooltip reopens (the stage may have gone to sleep)', () => {
    showTooltip('athens', true);
    hideTooltip();
    showTooltip('athens', true);
    expect(preload).toHaveBeenCalledTimes(2);
  });

  it('does not preload when the tooltip closes', () => {
    showTooltip('rome', true);
    hideTooltip();
    expect(preload).toHaveBeenCalledTimes(1);
  });

  it('also warms up from the accessible list (hover or focus)', () => {
    requestPreload('paris');
    expect(preload).toHaveBeenCalledWith('paris');
  });

  it('survives a failed preload', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    unbind();
    unbind = bindPreload(async () => {
      throw new Error('network');
    });
    showTooltip('rome', false);
    await Promise.resolve();
    await Promise.resolve();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('tooltip state', () => {
  it('a hover does not downgrade a pinned tooltip of the same city', () => {
    showTooltip('rome', true);
    showTooltip('rome', false);
    expect($openTooltip.get()).toEqual({ city: 'rome', pinned: true });
  });

  it('hover tooltips close after a grace period, pinned ones stay', () => {
    vi.useFakeTimers();
    showTooltip('rome', false);
    scheduleHideTooltip(100);
    vi.advanceTimersByTime(99);
    expect($openTooltip.get()).not.toBeNull();
    vi.advanceTimersByTime(2);
    expect($openTooltip.get()).toBeNull();

    showTooltip('rome', true);
    scheduleHideTooltip(100);
    vi.advanceTimersByTime(500);
    expect($openTooltip.get()).not.toBeNull();
  });

  it('re-entering during the grace period keeps the tooltip', () => {
    vi.useFakeTimers();
    showTooltip('rome', false);
    scheduleHideTooltip(100);
    showTooltip('rome', false);
    vi.advanceTimersByTime(500);
    expect($openTooltip.get()).not.toBeNull();
  });
});

describe('hotspot publishing', () => {
  it('skips updates that would not move anything', () => {
    const listener = vi.fn();
    const stop = $hotspots.listen(listener);
    const frame = [{ id: 'rome' as const, x: 0.5, y: 0.5, visible: true }];
    setHotspots(frame);
    setHotspots([{ ...frame[0], x: 0.50001 }]);
    expect(listener).toHaveBeenCalledTimes(1);
    setHotspots([{ ...frame[0], x: 0.6 }]);
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
  });
});

describe('view readouts', () => {
  it('publishes the view center with one decimal and skips changes the screen would not show', () => {
    const listener = vi.fn();
    const stop = $viewCenter.listen(listener);
    setViewCenter(48.84, 2.31);
    expect($viewCenter.get()).toEqual({ lat: 48.8, lon: 2.3 });
    setViewCenter(48.8399, 2.3099);
    expect(listener).toHaveBeenCalledTimes(1);
    setViewCenter(48.8, 2.5);
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
  });

  it('remembers the first interaction and the ambient state', () => {
    expect($hasInteracted.get()).toBe(false);
    markInteracted();
    expect($hasInteracted.get()).toBe(true);
    setAmbientActive(false);
    expect($ambientActive.get()).toBe(false);
  });
});
