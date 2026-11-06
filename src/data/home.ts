import type { PageMeta } from '../cities/types';
import { DEFAULT_LANG, withLang, type Lang } from '../i18n/lang';

type HomeTexts = Pick<PageMeta, 'title' | 'description' | 'ogImageAlt'> & { intro: string };

/** The hub: the page of the globe. No counts or full lists here: they go stale as cities are added (the full list is the ItemList of `jsonLd.ts`). */
export const home: PageMeta & HomeTexts & { es: HomeTexts } = {
  path: '/',
  title: 'Civitas — the world’s monuments in interactive 3D',
  description:
    'Spin the globe and explore the world’s monuments in interactive 3D, from the Parthenon to the Eiffel Tower: each story told by taking it apart.',
  ogImage: '/og/home.jpg',
  ogImageAlt: 'A night globe with amber points marking the monuments to visit.',
  intro: 'Spin the globe and pick a destination to step inside.',
  es: {
    title: 'Civitas — los monumentos del mundo en 3D interactivo',
    description:
      'Gira el globo y explora los monumentos del mundo en 3D interactivo, del Partenón a la Torre Eiffel: cada historia contada desarmándola.',
    ogImageAlt: 'Un globo nocturno con puntos ámbar que marcan los monumentos para visitar.',
    intro: 'Gira el globo y elige un destino para entrar.',
  },
};

/** The hub in a language: its `es` texts over the English ones, and its `path` under `/es`. */
export function localHome(lang: Lang): PageMeta & HomeTexts {
  if (lang === DEFAULT_LANG) return home;
  return { ...home, ...home.es, path: withLang(lang, home.path) };
}
