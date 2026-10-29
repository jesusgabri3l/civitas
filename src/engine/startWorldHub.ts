import { $appState, $targetStage, settleTransition, type StageId } from '../state/appStore';
import { $ambientActive, bindPreload } from '../state/globeStore';
import { startRouter } from '../state/router';
import type { QualityTier } from './quality/qualityTier';
import { Engine } from './Engine';

const tiers: QualityTier[] = ['low', 'medium', 'high'];

function ambientIdleFromQuery(): number | undefined {
  const value = Number(new URLSearchParams(location.search).get('ambientIdle'));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function tierFromQuery(): QualityTier | undefined {
  const value = new URLSearchParams(location.search).get('quality');
  return tiers.find((tier) => tier === value);
}

/** Connects the URL/state machine to the 3D engine. */
export async function startWorldHub(canvas: HTMLCanvasElement) {
  const root = canvas.closest('.the-stage');
  let engine: Engine;
  try {
    engine = new Engine({ canvas, tierOverride: tierFromQuery(), ambientIdleSeconds: ambientIdleFromQuery() });
  } catch (error) {
    console.error('WebGL is not available.', error);
    root?.classList.add('the-stage--no-webgl');
    return;
  }

  startRouter();
  let shownStage: StageId = $targetStage.get();
  await engine.start(shownStage);
  root?.classList.add('the-stage--ready');

  // Opening a globe card (or focusing a city in the list) warms that city's stage before the user commits.
  bindPreload((city) => engine.preload(city));

  // The store decides, the engine follows. Requests are serialized and the latest one wins.
  $targetStage.subscribe((target) => {
    if (target === shownStage) return;
    shownStage = target;
    void engine.goTo(target).then((completed) => {
      if (completed) settleTransition(target);
    });
  });

  if (new URLSearchParams(location.search).has('scrub')) {
    const { mountTripScrubber } = await import('./debug/tripScrubber');
    mountTripScrubber(engine);
  }

  // Small read-only handle for tests and debugging.
  Object.assign(window, {
    __worldhub: {
      engine,
      state: () => $appState.get(),
      info: () => ({
        tier: engine.tier,
        pixelRatio: engine.pixelRatio,
        frames: engine.framesRendered,
        memory: engine.memory,
        stages: engine.manager.statuses(),
        activeStage: engine.manager.active?.id ?? null,
        ambientActive: $ambientActive.get(),
        cameraDistance: engine.manager.active?.camera.position.length() ?? null,
      }),
    },
  });
}
