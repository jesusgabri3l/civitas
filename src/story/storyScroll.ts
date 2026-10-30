import type { ScrollTrigger as ScrollTriggerType } from 'gsap/ScrollTrigger';
import type { DestinationId } from '../data/destinations';
import { $appState, stageOf, type AppState } from '../state/appStore';
import { resetStoryProgress, setStoryProgress } from '../state/storyStore';
import { loadStoryHtml, storySections } from './storyContent';

/**
 * The scroll story of a city. The document scrolls only on a city page that has chapters; the canvas stays fixed.
 * Chapters are `<section data-story>` prerendered in the city's page (deep link) or fetched from it (SPA navigation).
 * GSAP ScrollTrigger turns the scroll into `$story`; the engine forwards it to the stage.
 */
/** Where a chapter starts playing: its top at this height of the viewport (the text is coming into view). */
const ENTER = '80%';

export function startStoryScroll(): () => void {
  const root = document.querySelector<HTMLElement>('[data-story-root]');
  const main = document.querySelector<HTMLElement>('.the-stage');
  if (!root || !main) return () => {};

  const html = document.documentElement;
  let triggers: ScrollTriggerType[] = [];
  let building = 0;
  const previousRestoration = history.scrollRestoration;
  history.scrollRestoration = 'manual';

  const mountedCity = () => (root.dataset.storyCity as DestinationId | undefined) ?? null;
  const lockScroll = () => (html.dataset.scroll = 'locked');
  const unlockScroll = () => (html.dataset.scroll = 'free');
  const hideStory = () => delete root!.dataset.visible;
  const showStory = () => (root!.dataset.visible = '');
  const scrollToTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

  function killTriggers() {
    building++;
    triggers.forEach((trigger) => trigger.kill());
    triggers = [];
  }

  function unmount() {
    killTriggers();
    root!.replaceChildren();
    delete root!.dataset.storyCity;
  }

  async function mount(city: DestinationId) {
    unmount();
    try {
      root!.innerHTML = await loadStoryHtml(city);
      root!.dataset.storyCity = city;
    } catch (error) {
      console.error(`Could not load the story of "${city}".`, error);
    }
  }

  async function buildTriggers() {
    const run = ++building;
    const sections = storySections(root!);
    if (sections.length === 0) return;
    const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
    if (run !== building) return;
    gsap.registerPlugin(ScrollTrigger);
    // A chapter plays while its text comes into view (its top from ENTER of the viewport up to the top) and ends in place: what
    // the visitor reads is what the maquette shows. Past that point it holds its final state until the next chapter comes in.
    // The prologue is on screen from the start, so it has no trigger: it is the state before chapter 1 comes in.
    triggers = sections.slice(1).map((section, offset) => {
      const index = offset + 1;
      return ScrollTrigger.create({
        trigger: section,
        start: `top ${ENTER}`,
        end: 'top top',
        onUpdate: (self) => self.isActive && setStoryProgress(index, self.progress),
        onLeave: () => setStoryProgress(index, 1),
        onLeaveBack: () => setStoryProgress(index - 1, 1),
      });
    });
    ScrollTrigger.refresh();
    syncToScroll();
  }

  /** On a reload or a jump mid-story: the chapter whose start is behind the scroll, at its progress. */
  function syncToScroll() {
    for (let i = triggers.length - 1; i >= 0; i--) {
      if (window.scrollY >= triggers[i].start) return setStoryProgress(i + 1, triggers[i].progress);
    }
    setStoryProgress(0, 1);
  }

  /** The trip started: lock the scroll, dress the page for the city it goes to and get its chapters ready (hidden). */
  async function onTravelling(target: ReturnType<typeof stageOf>) {
    lockScroll();
    hideStory(); // hidden for the whole trip, back to the globe or not: it only fades in once settled
    if (target === 'globe') {
      delete main!.dataset.city;
      return;
    }
    main!.dataset.city = target;
    if (mountedCity() === target) return;
    scrollToTop();
    resetStoryProgress();
    await mount(target);
  }

  async function onSettled(state: AppState) {
    const target = stageOf(state);
    if (target === 'globe') {
      hideStory();
      unmount();
      delete main!.dataset.city;
      lockScroll();
      scrollToTop();
      resetStoryProgress();
      return;
    }
    main!.dataset.city = target;
    if (mountedCity() !== target) await mount(target);
    if (stageOf($appState.get()) !== target || $appState.get().kind === 'transitioning') return; // the user moved on while it loaded
    if (storySections(root!).length === 0) return lockScroll();
    showStory();
    unlockScroll();
    if (triggers.length === 0) await buildTriggers();
    else triggers[0].refresh();
  }

  const stop = $appState.subscribe((state) => {
    if (state.kind === 'transitioning') void onTravelling(stageOf(state));
    else void onSettled(state);
  });

  return () => {
    stop();
    killTriggers();
    history.scrollRestoration = previousRestoration;
  };
}
