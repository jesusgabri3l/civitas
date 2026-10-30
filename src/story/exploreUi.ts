import { $explorePart, $exploreView } from '../state/storyStore';

/**
 * The Explore chapter of a monument page: view buttons (`[data-explore-view]`), part buttons (`[data-explore-part]`) and the part
 * cards (`[data-explore-card]`). Buttons write the store, the store drives the maquette (and a tap on the maquette writes it too),
 * and the cards follow the store. Wired by delegation: the story is replaced on every mount.
 */
export function startExploreUi(): () => void {
  const root = document.querySelector<HTMLElement>('[data-story-root]');
  if (!root) return () => {};

  const onClick = (event: Event) => {
    const target = event.target as Element;
    const view = target.closest<HTMLElement>('[data-explore-view]');
    if (view) {
      $exploreView.set(view.dataset.exploreView || null);
      return;
    }
    const part = target.closest<HTMLElement>('[data-explore-part]');
    if (part) {
      const id = part.dataset.explorePart || null;
      $explorePart.set($explorePart.get() === id ? null : id);
      return;
    }
    if (target.closest('[data-explore-close]')) $explorePart.set(null);
  };

  function markViews(view: string | null) {
    root!.querySelectorAll<HTMLElement>('[data-explore-view]').forEach((button, index) => {
      // No pick yet: the first button (the chapter's own state) is the pressed one.
      const pressed = view === null ? index === 0 : button.dataset.exploreView === view;
      button.setAttribute('aria-pressed', String(pressed));
    });
  }

  function showPart(part: string | null) {
    root!.querySelectorAll<HTMLElement>('[data-explore-part]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.explorePart === part));
    });
    root!.querySelectorAll<HTMLElement>('[data-explore-card]').forEach((card) => {
      card.hidden = card.dataset.exploreCard !== part;
      if (!card.hidden) revealInPanel(card);
    });
  }

  /** The Explore text scrolls inside its own panel on small screens: bring the opened card into it (never scroll the page). */
  function revealInPanel(card: HTMLElement) {
    const panel = card.closest<HTMLElement>('.monument-chapter__body');
    if (!panel || panel.scrollHeight <= panel.clientHeight) return;
    const cardBox = card.getBoundingClientRect();
    const panelBox = panel.getBoundingClientRect();
    const below = cardBox.bottom - panelBox.bottom;
    const above = panelBox.top - cardBox.top;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (below > 0) panel.scrollBy({ top: below + 12, behavior: smooth ? 'smooth' : 'instant' });
    else if (above > 0) panel.scrollBy({ top: -above - 12, behavior: smooth ? 'smooth' : 'instant' });
  }

  root.addEventListener('click', onClick);
  const stopView = $exploreView.subscribe(markViews);
  const stopPart = $explorePart.subscribe(showPart);
  // The story HTML is swapped on mount: re-apply the state once the new markup is in.
  const observer = new MutationObserver(() => {
    markViews($exploreView.get());
    showPart($explorePart.get());
  });
  observer.observe(root, { childList: true });

  return () => {
    root.removeEventListener('click', onClick);
    stopView();
    stopPart();
    observer.disconnect();
  };
}
