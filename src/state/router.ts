import { destinations, type DestinationId } from '../data/destinations';
import {
  $appState,
  beginTransition,
  initAppState,
  setSettledState,
  stageOf,
  stateFor,
  type StageId,
} from './appStore';

const cityIds = new Set<string>(destinations.map(({ id }) => id));
const INFO_HASH = '#info';

export interface RouteLocation {
  stage: StageId;
  info: boolean;
}

function slugOf(pathname: string): string {
  return pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
}

export function parseLocation(pathname: string, hash = ''): RouteLocation {
  const slug = slugOf(pathname);
  if (!cityIds.has(slug)) return { stage: 'globe', info: false };
  return { stage: slug as DestinationId, info: hash === INFO_HASH };
}

export function isKnownPath(pathname: string): boolean {
  const slug = slugOf(pathname);
  return slug === '' || cityIds.has(slug);
}

export function urlFor(stage: StageId, info = false): string {
  if (stage === 'globe') return '/';
  return `/${stage}${info ? INFO_HASH : ''}`;
}

let infoPushedByUs = false;

function applyLocation({ stage, info }: RouteLocation) {
  const current = $appState.get();
  if (stageOf(current) === stage && current.kind !== 'transitioning') {
    setSettledState(stage, info);
    return;
  }
  beginTransition(stage, info);
}

/** Pushes a history entry and updates the state. No page reload. Returns false when the URL was already this one. */
export function navigate(stage: StageId, info = false): boolean {
  const url = urlFor(stage, info);
  if (url === location.pathname + location.hash) return false;
  history.pushState(null, '', url);
  infoPushedByUs = info;
  applyLocation({ stage, info });
  return true;
}

export const openInfo = (city: DestinationId) => navigate(city, true);

export function closeInfo(city: DestinationId) {
  if (infoPushedByUs) {
    history.back();
    return;
  }
  history.replaceState(null, '', urlFor(city));
  applyLocation({ stage: city, info: false });
}

function onPopState() {
  infoPushedByUs = false;
  applyLocation(parseLocation(location.pathname, location.hash));
}

function onClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = (event.target as Element | null)?.closest?.('a');
  if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin || !isKnownPath(url.pathname)) return;
  event.preventDefault();
  const next = parseLocation(url.pathname, url.hash);
  navigate(next.stage, next.info);
}

/** Reads the URL (deep link), then listens to popstate and internal links. Returns a cleanup. */
export function startRouter(): () => void {
  const first = parseLocation(location.pathname, location.hash);
  initAppState(stateFor(first.stage, first.info));
  window.addEventListener('popstate', onPopState);
  document.addEventListener('click', onClick);
  return () => {
    window.removeEventListener('popstate', onPopState);
    document.removeEventListener('click', onClick);
  };
}
