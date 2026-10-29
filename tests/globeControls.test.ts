// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { GlobeControls } from '../src/engine/stages/globe/GlobeControls';

function setup(inertia = true) {
  const canvas = document.createElement('canvas');
  let yaw = 0;
  let grabs = 0;
  const wheels: number[] = [];
  const pinches: number[] = [];
  const controls = new GlobeControls({
    canvas,
    invalidate: () => {},
    radiansPerPixel: () => 0.01,
    onRotate: (delta) => {
      yaw += delta;
    },
    onGrab: () => {
      grabs += 1;
    },
    onWheel: (delta) => {
      wheels.push(delta);
    },
    onPinch: (ratio) => {
      pinches.push(ratio);
    },
    inertia: () => inertia,
  });
  controls.attach();
  const fire = (type: string, clientX: number, timeStamp: number, pointerId = 1, pointerType = 'mouse') => {
    const event = new Event(type) as Event & Record<string, unknown>;
    Object.assign(event, { clientX, clientY: 0, pointerId, isPrimary: pointerId === 1, pointerType, button: 0 });
    Object.defineProperty(event, 'timeStamp', { value: timeStamp });
    canvas.dispatchEvent(event);
  };
  return { canvas, controls, fire, yaw: () => yaw, grabs: () => grabs, wheels, pinches };
}

describe('GlobeControls', () => {
  it('rotates with the horizontal drag and lets vertical scroll through', () => {
    const { canvas, fire, yaw, grabs } = setup();
    expect(canvas.style.touchAction).toBe('none');
    expect(canvas.style.cursor).toBe('grab');
    fire('pointerdown', 100, 0);
    fire('pointermove', 150, 16);
    expect(yaw()).toBeCloseTo(0.5, 6);
    expect(grabs()).toBe(1);
    expect(canvas.style.cursor).toBe('grabbing');
    fire('pointerup', 150, 20);
    expect(canvas.style.cursor).toBe('grab');
  });

  it('coasts after a fast release and then stops', () => {
    const { controls, fire, yaw } = setup();
    fire('pointerdown', 0, 0);
    fire('pointermove', 20, 16);
    fire('pointermove', 40, 32);
    fire('pointerup', 40, 40);
    const released = yaw();
    expect(controls.coastingSpeed).toBeGreaterThan(0);
    let frames = 0;
    while (controls.update(1 / 60) && frames < 1000) frames += 1;
    expect(yaw()).toBeGreaterThan(released);
    expect(frames).toBeLessThan(1000);
    expect(controls.coastingSpeed).toBe(0);
  });

  it('does not coast after resting, or with reduced motion', () => {
    const rested = setup();
    rested.fire('pointerdown', 0, 0);
    rested.fire('pointermove', 40, 16);
    rested.fire('pointerup', 40, 500);
    expect(rested.controls.coastingSpeed).toBe(0);

    const reduced = setup(false);
    reduced.fire('pointerdown', 0, 0);
    reduced.fire('pointermove', 40, 16);
    reduced.fire('pointerup', 40, 20);
    expect(reduced.controls.coastingSpeed).toBe(0);
  });

  it('stops listening once detached', () => {
    const { controls, fire, yaw } = setup();
    controls.detach();
    fire('pointerdown', 0, 0);
    fire('pointermove', 50, 16);
    expect(yaw()).toBe(0);
  });

  it('reports the wheel delta (capped) and stops the page from scrolling', () => {
    const { wheels } = setup();
    const wheel = (deltaY: number) => {
      const event = new Event('wheel', { cancelable: true }) as Event & Record<string, unknown>;
      Object.assign(event, { deltaY, deltaMode: 0 });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(wheel(-100)).toBe(true);
    expect(wheel(100)).toBe(true);
    expect(wheel(5000)).toBe(true);
    expect(wheels).toEqual([-100, 100, 120]);
  });

  it('pinches: reports the finger distance ratio (apart > 1) and the pinch does not coast', () => {
    const { controls, fire, pinches, yaw } = setup();
    fire('pointerdown', 100, 0, 1, 'touch');
    fire('pointerdown', 200, 1, 2, 'touch'); // 100px apart
    fire('pointermove', 300, 16, 2, 'touch'); // 200px apart
    expect(pinches.at(-1)).toBeCloseTo(2, 6);
    fire('pointermove', 250, 32, 2, 'touch'); // 150px apart
    expect(pinches.at(-1)).toBeCloseTo(150 / 200, 6);
    expect(yaw()).toBe(0);
    fire('pointerup', 250, 40, 2, 'touch');
    fire('pointermove', 400, 50, 1, 'touch'); // the remaining finger does not turn into a drag
    fire('pointerup', 400, 60, 1, 'touch');
    expect(yaw()).toBe(0);
    expect(controls.coastingSpeed).toBe(0);
  });

  it('stops listening to the wheel once detached', () => {
    const { controls, wheels } = setup();
    controls.detach();
    window.dispatchEvent(Object.assign(new Event('wheel', { cancelable: true }), { deltaY: -100 }));
    expect(wheels).toHaveLength(0);
  });
});
