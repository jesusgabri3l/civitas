import { $appState, $targetStage, settleTransition, type StageId } from '../state/appStore';
import { startRouter } from '../state/router';
import type { QualityTier } from './quality/qualityTier';
import { Engine } from './Engine';

const tiers: QualityTier[] = ['low', 'medium', 'high'];

function tierFromQuery(): QualityTier | undefined {
  const value = new URLSearchParams(location.search).get('quality');
  return tiers.find((tier) => tier === value);
}

/** Connects the URL/state machine to the 3D engine. */
export async function startWorldHub(canvas: HTMLCanvasElement) {
  const root = canvas.closest('.the-stage');
  let engine: Engine;
  try {
    engine = new Engine({ canvas, tierOverride: tierFromQuery() });
  } catch (error) {
    console.error('WebGL is not available.', error);
    root?.classList.add('the-stage--no-webgl');
    return;
  }

  startRouter();
  let shownStage: StageId = $targetStage.get();
  await engine.start(shownStage);
  root?.classList.add('the-stage--ready');

  // The store decides, the engine follows. Requests are serialized and the latest one wins.
  $targetStage.subscribe((target) => {
    if (target === shownStage) return;
    shownStage = target;
    void engine.goTo(target).then((completed) => {
      if (completed) settleTransition(target);
    });
  });

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
      }),
    },
  });
}
