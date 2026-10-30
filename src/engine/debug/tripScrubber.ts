import type { Engine } from '../Engine';

const SPEEDS = [0, 0.1, 0.25, 0.5, 1];

/**
 * Dev-only panel (`?scrub`) to study the globe <-> city transition frame by frame.
 * Pick a speed (0 freezes it), click a city or go back, then drag the slider through the trip.
 */
export function mountTripScrubber(engine: Engine) {
  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;left:16px;bottom:16px;z-index:9999;width:300px;padding:12px;border-radius:8px;' +
    'background:rgba(0,0,0,.8);color:#fff;font:12px/1.5 ui-monospace,monospace;';
  panel.innerHTML = `
    <div style="display:flex;gap:4px;margin-bottom:8px" data-speeds></div>
    <input type="range" min="0" max="1" step="0.001" value="0" style="width:100%" data-slider disabled>
    <pre style="margin:6px 0 0;white-space:pre-wrap" data-readout>Sin transición. Elige velocidad y haz clic en una ciudad.</pre>`;
  document.body.append(panel);

  const slider = panel.querySelector<HTMLInputElement>('[data-slider]')!;
  const readout = panel.querySelector<HTMLElement>('[data-readout]')!;
  const speeds = panel.querySelector<HTMLElement>('[data-speeds]')!;

  let speed = 0;
  const buttons = SPEEDS.map((value) => {
    const button = document.createElement('button');
    button.textContent = value === 0 ? 'pausa' : `${value}x`;
    button.style.cssText = 'flex:1;padding:4px 0;border:0;border-radius:4px;cursor:pointer;font:inherit;';
    button.addEventListener('click', () => setSpeed(value));
    speeds.append(button);
    return button;
  });

  function setSpeed(value: number) {
    speed = value;
    engine.setTripTimeScale(value);
    buttons.forEach((button, index) => {
      const active = SPEEDS[index] === value;
      button.style.background = active ? '#e0a040' : '#333';
      button.style.color = active ? '#000' : '#fff';
    });
  }
  setSpeed(speed);

  let dragging = false;
  slider.addEventListener('pointerdown', () => (dragging = true));
  slider.addEventListener('pointerup', () => (dragging = false));
  slider.addEventListener('input', () => engine.scrubTrip(Number(slider.value)));

  const format = (value: number) => value.toFixed(2).padStart(5);
  const update = () => {
    const trip = engine.tripState();
    slider.disabled = !trip;
    if (trip) {
      if (!dragging) slider.value = String(trip.progress);
      const { zoom, mix, snapScale, cityAway, blur, reveal } = trip.sample;
      readout.textContent =
        `${trip.from} -> ${trip.to} (${trip.mode})  p ${format(trip.progress)}\n` +
        `zoom ${format(zoom)}  mix ${format(mix)}
` +
        `snapScale ${format(snapScale)}  cityAway ${format(cityAway)}
` +
        `reveal ${format(reveal)}  blur ${format(blur)}  anchor ${format(trip.anchor.x)},${format(trip.anchor.y)}`;
    }
    requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}
