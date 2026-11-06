/** Languages of the site: English at the root, Spanish under `/es` (slugs stay in English: `/es/rome`). Plan: docs/i18n-plan.md. */
export const LANGS = ['en', 'es'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

export const langFrom = (value: string | undefined | null): Lang => (value === 'es' ? 'es' : DEFAULT_LANG);

const SPANISH_PREFIX = /^\/es(?=\/|$)/;

export const langOfPath = (pathname: string): Lang => (SPANISH_PREFIX.test(pathname) ? 'es' : DEFAULT_LANG);

/** '/es/rome' -> '/rome', '/es' -> '/'. */
export const stripLang = (pathname: string): string => pathname.replace(SPANISH_PREFIX, '') || '/';

/** The same route in another language: '/rome' -> '/es/rome', '/' -> '/es'. A trailing slash is dropped. */
export function withLang(lang: Lang, pathname: string): string {
  const base = stripLang(pathname).replace(/(.)\/$/, '$1');
  if (lang === DEFAULT_LANG) return base;
  return base === '/' ? `/${lang}` : `/${lang}${base}`;
}

/** Each language named in itself (the selector shows both). */
export const LANG_NAMES: Record<Lang, string> = { en: 'English', es: 'Español' };

export const otherLang = (lang: Lang): Lang => (lang === 'es' ? 'en' : 'es');

/** Language of the page on screen (client only; the server reads `Astro.currentLocale`). */
export const currentLang = (): Lang => (typeof document === 'undefined' ? DEFAULT_LANG : langFrom(document.documentElement.lang));

/** hreflang alternates of a page, reciprocal and self-referencing, plus x-default (the English version). */
export function alternateUrls(origin: string | URL, pathname: string): { hreflang: string; href: string }[] {
  const url = (lang: Lang) => new URL(withLang(lang, pathname), origin).href;
  return [
    { hreflang: 'en', href: url('en') },
    { hreflang: 'es', href: url('es') },
    { hreflang: 'x-default', href: url('en') },
  ];
}
