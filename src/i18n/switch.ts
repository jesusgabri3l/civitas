import { otherLang, stripLang, withLang, currentLang, type Lang } from './lang';

/**
 * The language selector (`<a data-lang-switch="es" hreflang>`): remembers the choice in a cookie (the middleware reads it on `/`) and
 * reloads on the equivalent route. The SPA changes the path without reloading, so the target is computed from `location` at click time.
 */
document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>('a[data-lang-switch]');
  if (!link) return;
  const lang = (link.dataset.langSwitch as Lang | undefined) ?? otherLang(currentLang());
  event.preventDefault();
  document.cookie = `lang=${lang}; path=/; max-age=31536000; SameSite=Lax`;
  location.assign(withLang(lang, stripLang(location.pathname)) + location.hash);
});
