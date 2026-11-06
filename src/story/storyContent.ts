import type { DestinationId } from '../cities';
import { currentLang, withLang } from '../i18n/lang';

const SECTION_SELECTOR = '[data-story]';
/** What the page renders into the story slot: the chapters and the chrome that goes with them (top bar, timeline). */
const MOUNTED_SELECTOR = `${SECTION_SELECTOR}, [data-story-chrome]`;
const cache = new Map<string, Promise<string>>();

async function fetchStoryHtml(city: DestinationId, url: string): Promise<string> {
  const response = await fetch(url, { headers: { Accept: 'text/html' } });
  if (!response.ok) throw new Error(`Story of "${city}" answered ${response.status}.`);
  const page = new DOMParser().parseFromString(await response.text(), 'text/html');
  return [...page.querySelectorAll(MOUNTED_SELECTOR)].map((section) => section.outerHTML).join('');
}

/** The prerendered story of a city (its page's `[data-story]` sections and chrome), fetched once and cached (SPA navigation). */
export function loadStoryHtml(city: DestinationId): Promise<string> {
  // The page of the current language (`/athens` or `/es/athens`); it is also the cache key.
  const key = withLang(currentLang(), `/${city}`);
  let html = cache.get(key);
  if (!html) {
    html = fetchStoryHtml(city, key);
    cache.set(key, html);
    html.catch(() => cache.delete(key));
  }
  return html;
}

export const preloadStory = (city: DestinationId) => loadStoryHtml(city).catch((error) => console.error(`Could not load the story of "${city}".`, error));

export const storySections = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>(SECTION_SELECTOR)];
