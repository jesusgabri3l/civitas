import type { CityMeta, PageMeta } from './types';

const SITE_NAME = 'Civitas';

/** Structured data of the hub: the site. */
export function websiteJsonLd(site: URL, home: PageMeta) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: new URL(home.path, site).href,
    description: home.description,
  };
}

/** Structured data of a city page: the monument and the breadcrumb Civitas › City. Everything comes from its `meta`. */
export function cityJsonLd(site: URL, home: PageMeta, city: CityMeta) {
  const url = new URL(city.path, site).href;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'LandmarksOrHistoricalBuildings',
      name: city.monument,
      description: city.description,
      url,
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
