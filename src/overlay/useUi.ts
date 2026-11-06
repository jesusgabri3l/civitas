import { inject, provide, type InjectionKey } from 'vue';
import { citiesFor } from '../cities';
import type { Lang } from '../i18n/lang';
import { ui, type Ui } from '../i18n/ui';

interface OverlayLanguage {
  lang: Lang;
  text: Ui;
}

const key: InjectionKey<OverlayLanguage> = Symbol('overlay-language');

/** TheOverlay hands its language to every child. Never read `document` for it: the islands render on the server too (hydration mismatch). */
export const provideUi = (lang: Lang) => provide(key, { lang, text: ui[lang] });

export function useUi() {
  const value = inject(key);
  if (!value) throw new Error('useUi() needs TheOverlay above it.');
  return { ...value, cities: citiesFor(value.lang) };
}
