import { $appState, $targetStage, settleTransition, type StageId } from '../state/appStore';
import { $ambientActive, bindPreload } from '../state/globeStore';
import { startPageMeta } from '../state/pageMeta';
import { startRouter } from '../state/router';
import { $explorePart, $exploreView, $story } from '../state/storyStore';
import { startWebVitals, track } from '../state/track';
import { startExploreUi } from '../story/exploreUi';
import { startTimelineUi } from '../story/timelineUi';
import { preloadStory } from '../story/storyContent';
import { startStoryScroll } from '../story/storyScroll';
import type { QualityTier } from './quality/qualityTier';
import { Engine } from './Engine';
import { warmProceduralSurfaces } from './stages/shared/proceduralSurfaces';

const tiers: QualityTier[] = ['low', 'medium', 'high'];

function ambientIdleFromQuery(): number | undefined {
  const value = Number(new URLSearchParams(location.search).get('ambientIdle'));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function tierFromQuery(): QualityTier | undefined {
  const value = new URLSearchParams(location.search).get('quality');
  return tiers.find((tier) => tier === value);
}

/**
 * No WebGL (or the first stage would not load): the page still works as text. Routing, the index and the chapters run; trips
 * settle at once since there is nothing to animate.
 */
function startWithoutStage(root: Element | null, started: boolean) {
  root?.classList.add('the-stage--no-webgl');
  if (!started) {
    startRouter();
    startPageMeta();
    startStoryScroll();
    startTimelineUi();
  }
  $targetStage.subscribe((target) => settleTransition(target));
}

/** Connects the URL/state machine to the 3D engine. */
export async function startCivitas(canvas: HTMLCanvasElement) {
  startWebVitals();
  const root = canvas.closest('.the-stage');
  let engine: Engine;
  try {
    engine = new Engine({ canvas, tierOverride: tierFromQuery(), ambientIdleSeconds: ambientIdleFromQuery() });
  } catch (error) {
    console.error('WebGL is not available.', error);
    startWithoutStage(root, false);
    return;
  }

  startRouter();
  startPageMeta();
  startStoryScroll();
  startTimelineUi();
  startExploreUi();
  let shownStage: StageId = $targetStage.get();
  try {
    await engine.start(shownStage);
  } catch (error) {
    console.error(`Could not load the "${shownStage}" scene.`, error);
    engine.dispose();
    startWithoutStage(root, true);
    return;
  }
  root?.classList.add('the-stage--ready');
  warmProceduralSurfaces();

  // Opening a globe card (or focusing a city in the list) warms that city's stage before the user commits.
  bindPreload((city) => Promise.all([engine.preload(city), preloadStory(city)]));

  // The scroll story drives the camera and the maquette of the stage on screen (stages without a story ignore it).
  $story.subscribe(({ chapter, t }) => engine.setStory(chapter, t));
  // Explore chapter: the view buttons and the part cards drive the maquette; a tap on a part opens its card.
  const sendExplore = () => engine.setExplore($exploreView.get(), $explorePart.get());
  $exploreView.subscribe(sendExplore);
  $explorePart.subscribe(sendExplore);
  engine.onSelect((id) => $explorePart.set(id));

  // Analytics: what the visitor does inside a monument (the city is whatever stage is on screen).
  const cityOnScreen = () => {
    const stage = $targetStage.get();
    return stage === 'globe' ? null : stage;
  };
  const chaptersReached = new Set<string>();
  $story.listen(({ chapter }) => {
    const city = cityOnScreen();
    if (!city || chapter === 0 || chaptersReached.has(`${city}:${chapter}`)) return;
    chaptersReached.add(`${city}:${chapter}`);
    track('chapter_reached', { city, chapter });
  });
  $exploreView.listen((view) => {
    const city = cityOnScreen();
    if (city && view) track('explore_view', { city, view });
  });
  $explorePart.listen((piece) => {
    const city = cityOnScreen();
    if (city && piece) track('piece_open', { city, piece });
  });
  // A new visit to a monument counts its chapters again.
  $targetStage.listen((stage) => stage === 'globe' && chaptersReached.clear());

  // The store decides, the engine follows. Requests are serialized and the latest one wins.
  $targetStage.subscribe((target) => {
    if (target === shownStage) return;
    shownStage = target;
    // A target that changed while nothing is "transitioning" was a jump (back on a touch screen): no trip.
    const jump = $appState.get().kind !== 'transitioning';
    void engine.goTo(target, jump).then((completed) => {
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
