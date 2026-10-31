// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cities } from '../src/cities';
import { home } from '../src/data/home';
import { resetAppStateForTests, setSettledState } from '../src/state/appStore';
import { applyPageMeta, startPageMeta } from '../src/state/pageMeta';

const head = `
  <title>x</title>
  <meta name="description" content="x" />
  <link rel="canonical" href="https://civitas.pages.dev/athens" />
  <meta property="og:title" content="x" />
  <meta property="og:description" content="x" />
  <meta property="og:url" content="x" />
  <meta property="og:image" content="x" />
  <meta property="og:image:alt" content="x" />
  <meta name="twitter:image" content="x" />`;
const content = (selector: string) => document.head.querySelector(selector)?.getAttribute('content');

describe('page meta', () => {
  beforeEach(() => {
    document.head.innerHTML = head;
    resetAppStateForTests();
  });
  afterEach(() => resetAppStateForTests());

  it('dresses the head for a city and for the globe', () => {
    const rome = cities.find(({ id }) => id === 'rome')!;
    applyPageMeta('rome');
    expect(document.title).toBe(rome.title);
    expect(content('meta[name="description"]')).toBe(rome.description);
    expect(content('meta[property="og:url"]')).toBe('https://civitas.pages.dev/rome');
    expect(content('meta[property="og:image"]')).toBe('https://civitas.pages.dev/og/rome.jpg');
    expect(content('meta[property="og:image:alt"]')).toBe(rome.ogImageAlt);
    expect(content('meta[name="twitter:image"]')).toBe('https://civitas.pages.dev/og/rome.jpg');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://civitas.pages.dev/rome');

    applyPageMeta('globe');
    expect(document.title).toBe(home.title);
    expect(content('meta[property="og:title"]')).toBe(home.title);
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://civitas.pages.dev/');
  });

  it('follows the stage when the app navigates from a city to the globe', () => {
    setSettledState('athens', false);
    const stop = startPageMeta();
    setSettledState('globe', false);
    expect(document.title).toBe(home.title);
    stop();
  });
});
