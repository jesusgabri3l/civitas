import { $story } from '../state/storyStore';
import { storySections } from './storyContent';

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The chapter navigation of a monument page (timeline, top bar, CTAs): marks the chapter on screen (`aria-current`) and the ones
 * already read (`data-passed`), and scrolls to a chapter when its link is used. The chrome is mounted with the story (replaced on
 * every mount), so it is wired by delegation on the story root.
 */
export function startTimelineUi(): () => void {
  const root = document.querySelector<HTMLElement>('[data-story-root]');
  if (!root) return () => {};

  function markChapter(chapter: number) {
    root!.querySelectorAll<HTMLElement>('[data-nav-link]').forEach((link) => {
      if (Number(link.dataset.navLink) === chapter) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
      // Chapters already read: the timeline fills its line up to the current one.
      link.toggleAttribute('data-passed', Number(link.dataset.navLink) < chapter);
    });
  }

  function scrollToChapter(index: number) {
    const section = storySections(root!)[index];
    if (!section) return;
    const top = window.scrollY + section.getBoundingClientRect().top;
    window.scrollTo({ top, left: 0, behavior: prefersReducedMotion() ? 'instant' : 'smooth' });
  }

  const onClick = (event: Event) => {
    const link = (event.target as Element).closest<HTMLElement>('[data-nav-link], [data-scroll-to]');
    if (!link) return;
    event.preventDefault();
    scrollToChapter(Number(link.dataset.navLink ?? link.dataset.scrollTo));
  };

  root.addEventListener('click', onClick);
  const stopStory = $story.subscribe(({ chapter }) => markChapter(chapter));

  return () => {
    root.removeEventListener('click', onClick);
    stopStory();
  };
}
