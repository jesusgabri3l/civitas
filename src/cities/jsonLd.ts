import { citiesFor } from './index';
import type { CityMeta, PageMeta } from './types';
import { ui } from '../i18n/ui';
import type { Lang } from '../i18n/lang';

const SITE_NAME = 'Civitas';

/** Structured data of the hub: the site and the list of its monuments (from the registry, so a new city joins on its own). `home` comes localized. */
export function websiteJsonLd(site: URL, home: PageMeta, lang: Lang) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: new URL(home.path, site).href,
      description: home.description,
      inLanguage: lang,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: ui[lang].monumentsListName,
      inLanguage: lang,
      itemListElement: citiesFor(lang).map((city, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: `${city.monument}, ${city.name}`,
        url: new URL(city.path, site).href,
      })),
    },
  ];
}

/** Structured data of a city page: the monument and the breadcrumb Civitas › City. `home` and `city` come localized. */
export function cityJsonLd(site: URL, home: PageMeta, city: CityMeta, lang: Lang) {
  const url = new URL(city.path, site).href;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'LandmarksOrHistoricalBuildings',
      name: city.monument,
      description: city.description,
      url,
      inLanguage: lang,
      image: new URL(city.ogImage, site).href,
      geo: { '@type': 'GeoCoordinates', latitude: city.coordinates.lat, longitude: city.coordinates.lon },
      address: { '@type': 'PostalAddress', addressLocality: city.name, addressCountry: city.country },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: new URL(home.path, site).href },
        { '@type': 'ListItem', position: 2, name: city.name, item: url },
      ],
    },
  ];
}
