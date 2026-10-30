import { $appState, $targetStage, settleTransition, type StageId } from '../state/appStore';
import { $ambientActive, bindPreload } from '../state/globeStore';
import { startRouter } from '../state/router';
import { $explorePart, $exploreView, $story } from '../state/storyStore';
import { startExploreUi } from '../story/exploreUi';
import { startTimelineUi } from '../story/timelineUi';
import { preloadStory } from '../story/storyContent';
import { startStoryScroll } from '../story/storyScroll';
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
export async function startCivitas(canvas: HTMLCanvasElement) {
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
  startStoryScroll();
  startTimelineUi();
  startExploreUi();
  let shownStage: StageId = $targetStage.get();
  await engine.start(shownStage);
  root?.classList.add('the-stage--ready');

  // Opening a globe card (or focusing a city in the list) warms that city's stage before the user commits.
  bindPreload((city) => Promise.all([engine.preload(city), preloadStory(city)]));

  // The scroll story drives the camera and the maquette of the stage on screen (stages without a story ignore it).
  $story.subscribe(({ chapter, t }) => engine.setStory(chapter, t));
  // Explore chapter: the view buttons and the part cards drive the maquette; a tap on a part opens its card.
  const sendExplore = () => engine.setExplore($exploreView.get(), $explorePart.get());
  $exploreView.subscribe(sendExplore);
  $explorePart.subscribe(sendExplore);
  engine.onSelect((id) => $explorePart.set(id));

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
    __civitas: {
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
