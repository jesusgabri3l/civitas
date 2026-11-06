import { cities, localCity } from '../cities';
import type { PageMeta } from '../cities/types';
import { localHome } from '../data/home';
import { alternateUrls, currentLang, type Lang } from '../i18n/lang';
import { $targetStage, type StageId } from './appStore';

function pageOf(stage: StageId, lang: Lang): PageMeta {
  const city = cities.find(({ id }) => id === stage);
  return city ? localCity(city, lang) : localHome(lang);
}

function setContent(selector: string, attribute: 'content' | 'href', value: string) {
  document.head.querySelector(selector)?.setAttribute(attribute, value);
}

/** Dresses the head for the page of a stage (title, description, canonical, hreflang, Open Graph), as the server did for the first page. */
export function applyPageMeta(stage: StageId) {
  const lang = currentLang();
  const { title, description, path, ogImage, ogImageAlt } = pageOf(stage, lang);
  // The site origin is the one of the canonical the server rendered.
  const origin = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? location.href;
  const url = new URL(path, origin).href;
  document.title = title;
  setContent('meta[name="description"]', 'content', description);
  setContent('link[rel="canonical"]', 'href', url);
  alternateUrls(origin, path).forEach(({ hreflang, href }) => setContent(`link[rel="alternate"][hreflang="${hreflang}"]`, 'href', href));
  setContent('meta[property="og:title"]', 'content', title);
  setContent('meta[property="og:description"]', 'content', description);
  setContent('meta[property="og:url"]', 'content', url);
  const image = new URL(ogImage, origin).href;
  setContent('meta[property="og:image"]', 'content', image);
  setContent('meta[property="og:image:alt"]', 'content', ogImageAlt);
  setContent('meta[name="twitter:title"]', 'content', title);
  setContent('meta[name="twitter:description"]', 'content', description);
  setContent('meta[name="twitter:image"]', 'content', image);
  setContent('meta[name="twitter:image:alt"]', 'content', ogImageAlt);
}

/** Keeps the head in step with the stage on screen during SPA navigation (the first page already comes dressed by the server). */
export function startPageMeta(): () => void {
  return $targetStage.listen(applyPageMeta);
}
