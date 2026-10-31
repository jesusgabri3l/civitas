import type { CityMeta } from './types';

/**
 * The page tokens of every city as CSS, from `meta.theme`: `[data-city='<id>']` gets the `--city-*` custom properties and the root
 * the accent of the scrollbar while that city is on screen. For ALL the cities: SPA navigation only swaps `data-city` in the client.
 */
export function cityThemeCss(cities: readonly CityMeta[]): string {
  return cities
    .map(({ id, theme }) => {
      const tokens = [
        `--city-ground:${theme.ground}`,
        `--city-accent:${theme.accent}`,
        `--city-accent-strong:${theme.accentStrong}`,
        `--city-display:${theme.fontDisplay}`,
        `--city-display-style:${theme.displayStyle ?? 'normal'}`,
        `--city-display-weight:${theme.displayWeight ?? 400}`,
        `--city-body:${theme.fontBody}`,
      ];
      return `[data-city='${id}']{${tokens.join(';')}}:root:has([data-city='${id}']){--scrollbar-accent:${theme.accent}}`;
    })
    .join('');
}
