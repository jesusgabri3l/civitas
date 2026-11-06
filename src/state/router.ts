import { cities, type DestinationId } from '../cities';
import {
  $appState,
  beginTransition,
  initAppState,
  setSettledState,
  stageOf,
  stateFor,
  type StageId,
} from './appStore';
import { currentLang, langOfPath, stripLang, withLang } from '../i18n/lang';
import { track, trackPageview } from './track';

const cityIds = new Set<string>(cities.map(({ id }) => id));
const INFO_HASH = '#info';

export interface RouteLocation {
  stage: StageId;
  info: boolean;
}

function slugOf(pathname: string): string {
  return stripLang(pathname).replace(/^\/+|\/+$/g, '').toLowerCase();
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
  return withLang(currentLang(), stage === 'globe' ? '/' : `/${stage}`) + (stage !== 'globe' && info ? INFO_HASH : '');
}

let infoPushedByUs = false;

const isTouchScreen = () => window.matchMedia?.('(pointer: coarse)').matches ?? false;

function applyLocation({ stage, info }: RouteLocation, instant = false) {
  const current = $appState.get();
  if (stageOf(current) === stage && current.kind !== 'transitioning') {
    setSettledState(stage, info);
    return;
  }
  if (instant && current.kind !== 'transitioning') {
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
  trackPageview();
  const next = parseLocation(location.pathname, location.hash);
  // Touch back (iOS swipe or the browser button, indistinguishable): the OS already animated it, so the globe appears at once.
  applyLocation(next, next.stage === 'globe' && isTouchScreen());
}

function onClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = (event.target as Element | null)?.closest?.('a');
  if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin || !isKnownPath(url.pathname)) return;
  // Another language is another document: the browser loads it (the language selector relies on this).
  if (langOfPath(url.pathname) !== currentLang()) return;
  event.preventDefault();
  const next = parseLocation(url.pathname, url.hash);
  navigate(next.stage, next.info);
}

/** Reads the URL (deep link), then listens to popstate and internal links. Returns a cleanup. */
export function startRouter(): () => void {
  const first = parseLocation(location.pathname, location.hash);
  initAppState(stateFor(first.stage, first.info));
  if (first.stage !== 'globe') track('city_open', { city: first.stage, from: 'url' });
  window.addEventListener('popstate', onPopState);
  document.addEventListener('click', onClick);
  return () => {
    window.removeEventListener('popstate', onPopState);
    document.removeEventListener('click', onClick);
  };
}
