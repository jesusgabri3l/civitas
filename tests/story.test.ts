import { beforeEach, describe, expect, it } from 'vitest';
import { scrollPosition, shotAt, StoryCamera, type CameraShot, type CameraTrack } from '../src/engine/stages/shared/StoryCamera';
import { sampleFor, secondsFor, swapAtFor, type TransitionMode } from '../src/engine/transition/timeline';
import { $explorePart, $exploreView, $story, resetStoryProgress, setStoryProgress } from '../src/state/storyStore';

// Three shots around the origin: east, north (a quarter turn), then closer and higher.
const track: CameraTrack = {
  keys: [
    { position: [10, 2, 0], target: [0, 0, 0], fov: 35 },
    { position: [0, 2, 10], target: [0, 0, 0], fov: 35 },
    { position: [0, 6, 5], target: [0, 1, 0], fov: 50 },
  ],
  hold: [0, 0.5, 0],
};
const emptyShot = (): CameraShot => ({ target: { x: 0, y: 0, z: 0 }, angle: 0, radius: 1, height: 0, fov: 35 });

describe('scrollPosition', () => {
  it('keeps the prologue at the first key', () => {
    expect(scrollPosition(0, 0.7, track)).toBe(0);
  });

  it('travels to the key of the chapter, arriving early by its hold share', () => {
    expect(scrollPosition(1, 0, track)).toBe(0);
    expect(scrollPosition(1, 0.25, track)).toBe(0.5);
    expect(scrollPosition(1, 0.5, track)).toBe(1);
    expect(scrollPosition(1, 0.9, track)).toBe(1);
    expect(scrollPosition(2, 0.5, track)).toBe(1.5);
  });

  it('clamps chapters outside the track', () => {
    expect(scrollPosition(-3, 1, track)).toBe(0);
    expect(scrollPosition(9, 1, track)).toBe(2);
  });
});

describe('shotAt', () => {
  it('lands exactly on each key', () => {
    const shot = shotAt(2, emptyShot(), track);
    expect(shot.target.y).toBe(1);
    expect(shot.radius).toBeCloseTo(5);
    expect(shot.height).toBeCloseTo(5);
    expect(shot.fov).toBe(50);
  });

  it('orbits between keys instead of cutting through the target', () => {
    const shot = shotAt(0.5, emptyShot(), track);
    expect(shot.radius).toBeCloseTo(10);
    expect(shot.angle).toBeCloseTo(Math.PI / 4);
  });

  it('takes the short way round across ±180°', () => {
    const wrap: CameraTrack = {
      keys: [
        { position: [-10, 0, 0.1], target: [0, 0, 0], fov: 35 },
        { position: [-10, 0, -0.1], target: [0, 0, 0], fov: 35 },
      ],
      hold: [0, 0],
    };
    const from = shotAt(0, emptyShot(), wrap).angle;
    const mid = shotAt(0.5, emptyShot(), wrap).angle;
    expect(Math.abs(mid - from)).toBeLessThan(0.02);
  });
});

describe('StoryCamera', () => {
  it('eases to the goal without overshooting, then rests', () => {
    const camera = new StoryCamera(track);
    camera.setProgress(1, 1);
    let previous = camera.shot.angle;
    let frames = 0;
    while (camera.update(1 / 60, true) && frames < 600) {
      expect(camera.shot.angle).toBeGreaterThanOrEqual(previous);
      expect(camera.shot.angle).toBeLessThanOrEqual(Math.PI / 2 + 1e-9);
      previous = camera.shot.angle;
      frames += 1;
    }
    expect(frames).toBeLessThan(600);
    expect(camera.shot.angle).toBeCloseTo(Math.PI / 2);
    expect(camera.update(1 / 60, true)).toBe(false);
  });

  it('cuts straight to the nearest key with reduced motion', () => {
    const camera = new StoryCamera(track);
    camera.setProgress(2, 0.4); // position 1.4 -> key 1
    expect(camera.update(1 / 60, false)).toBe(true);
    expect(camera.shot.angle).toBeCloseTo(Math.PI / 2);
    expect(camera.shot.fov).toBe(35);
    expect(camera.update(1 / 60, false)).toBe(false);
    camera.setProgress(2, 0.6); // position 1.6 -> key 2
    expect(camera.update(1 / 60, false)).toBe(true);
    expect(camera.shot.fov).toBe(50);
  });

  it('jumps and resets with no animation', () => {
    const camera = new StoryCamera(track);
    camera.jumpTo(2, 1);
    expect(camera.shot.fov).toBe(50);
    expect(camera.update(1 / 60, true)).toBe(false);
    camera.reset();
    expect(camera.shot.angle).toBeCloseTo(0);
    expect(camera.update(1 / 60, true)).toBe(false);
  });
});

describe('story progress', () => {
  beforeEach(() => resetStoryProgress());

  it('clamps progress and skips changes too small to move the camera', () => {
    setStoryProgress(1, 1.5);
    expect($story.get()).toEqual({ chapter: 1, t: 1 });
    const before = $story.get();
    setStoryProgress(1, 0.999);
    expect($story.get()).toBe(before);
    setStoryProgress(2, 0.999);
    expect($story.get()).toEqual({ chapter: 2, t: 0.999 });
  });

  it('reset goes back to the top and closes the explore view and card', () => {
    setStoryProgress(3, 0.5);
    $exploreView.set('built');
    $explorePart.set('frieze');
    resetStoryProgress();
    expect($story.get()).toEqual({ chapter: 0, t: 0 });
    expect($exploreView.get()).toBeNull();
    expect($explorePart.get()).toBeNull();
  });
});

describe('transition timeline', () => {
  const modes: TransitionMode[] = ['enter', 'exit', 'fade'];
  const fields = ['zoom', 'cityAway', 'mix', 'reveal', 'snapScale', 'blur'] as const;

  it('keeps every value finite and in range for the whole run', () => {
    for (const mode of modes) {
      for (let i = 0; i <= 100; i += 1) {
        const sample = sampleFor(mode, i / 100);
        for (const field of fields) expect(Number.isFinite(sample[field])).toBe(true);
        for (const field of ['zoom', 'cityAway', 'mix', 'reveal', 'blur'] as const) {
          expect(sample[field]).toBeGreaterThanOrEqual(-1e-9);
          expect(sample[field]).toBeLessThanOrEqual(1 + 1e-9);
        }
      }
    }
  });

  it('enter: starts on the globe and ends with the city at rest, no blur left', () => {
    const start = sampleFor('enter', 0);
    expect(start).toMatchObject({ zoom: 0, cityAway: 1, reveal: 0, snapScale: 1 });
    const end = sampleFor('enter', 1);
    expect(end).toMatchObject({ zoom: 1, cityAway: 0, reveal: 1 });
    expect(end.blur).toBeCloseTo(0);
  });

  it('enter: the snapshot carries the dive on with no jump at the swap', () => {
    const swap = swapAtFor('enter');
    const step = 1e-4;
    expect(sampleFor('enter', swap).snapScale).toBe(1);
    expect(sampleFor('enter', swap + step).snapScale).toBeCloseTo(1, 2);
    expect(sampleFor('enter', swap + step).snapScale).toBeGreaterThan(1);
  });

  it('exit: leaves the dive and closes the circle, pulling the snapshot away', () => {
    expect(sampleFor('exit', 1)).toMatchObject({ zoom: 0, reveal: 1, blur: 0 });
    expect(sampleFor('exit', 1).snapScale).toBeLessThan(1);
  });

  it('fade: a plain cross-fade, nothing moves', () => {
    expect(sampleFor('fade', 0)).toEqual({ zoom: 0, cityAway: 0, mix: 0, reveal: 0, snapScale: 1, blur: 0 });
    expect(sampleFor('fade', 1).mix).toBe(1);
  });

  it('the fade is much shorter than the dives', () => {
    expect(secondsFor('fade')).toBeLessThan(secondsFor('enter') / 2);
    expect(secondsFor('fade')).toBeLessThan(secondsFor('exit') / 2);
  });
});
