# Plan i18n: español en Civitas

Autor: tech-lead-advisor. Fecha: 2026-11-05. Va antes de la fase 5 de SEO.

El sitio funciona como una SPA: el router, `pageMeta` y `storyContent` construyen URLs a mano sin prefijo, y el texto del overlay Vue también se renderiza en el servidor (SSR).

Decidido: inglés en la raíz sin prefijo y español en `/es/...`, con i18n nativo de Astro (`prefixDefaultLocale: false`). Sin librería de i18n. Los slugs siguen en inglés (`/es/rome`) para que el router solo tenga que quitar el prefijo.

## 1. Dónde vive cada texto
- **UI** (overlay, 404, chrome de la historia, layout): un solo archivo nuevo, `src/i18n/ui.ts`, con `export const ui = { en: {...}, es: {...} }`, `type Lang = keyof typeof ui`, y `es` con `satisfies` contra las claves de `en`, así TS falla si falta una. Ahí también van `headlineLines` y `headlineSubtitle` (se borra `data/headline.ts`) y las etiquetas de región (los ids `Europe`… no cambian, solo lo que se muestra).
- **Meta de ciudad**: campo `es` dentro de cada `cities/<id>/meta.ts`, tipado en `CityMeta` como `es: Pick<CityMeta, 'name'|'monument'|'title'|'description'|'ogImageAlt'|'intro'|'country'|'glimpse'|'date'>`. Helper `localCity(city, lang)` en `cities/index.ts`, que mezcla `es` y antepone `/es` al `path`. Los campos `keywords` se quedan como están.
- **Home**: `home.es` en `data/home.ts`, con el mismo patrón.
- **Historias**: `cities/<id>/story.es.ts` (tipo `MonumentStory`). En `server.ts`, `monumentStories` pasa a ser `Record<Lang, Partial<Record<DestinationId, MonumentStory>>>`. Siguen siendo solo del servidor.
- **`soon`** en `monumentIndex.ts`: cada fila lleva `es: { monument, place, date }`. `monumentIndex` pasa a ser `monumentIndexFor(lang)`.

## 2. Rutas
- En `astro.config.mjs`: `i18n: { locales: ['en','es'], defaultLocale: 'en', routing: { prefixDefaultLocale: false } }`.
- Archivos nuevos `src/pages/es/index.astro` y `src/pages/es/[city].astro`, iguales a los actuales (mismos `getStaticPaths`).
- `TheLayout`, `HomeView`, `DestinationView` y `TheStage` leen `Astro.currentLocale`, sin pasar props entre archivos Astro.
- 404: Vercel sirve un solo `404.html`. Se deja un 404 bilingüe (una línea en cada idioma) y no se crea `/es/404`.

## 3. Cliente (lo que más se puede romper)
- `state/router.ts`: `slugOf` quita `^es/`. `isKnownPath` acepta `/es` y `/es/<city>`. `urlFor` antepone `/es` según `document.documentElement.lang`. En `onClick`, si la URL del enlace es de otro idioma, no se intercepta y se deja la recarga completa (así funciona el selector).
- `story/storyContent.ts`: hace el fetch a `${prefix}/${city}` y la clave del cache incluye el idioma.
- `state/pageMeta.ts`: usa `localCity` / `home.es` según el idioma. Además actualiza los `link[hreflang]`.
- Vue: se pasa `lang` como prop de `TheStage` a `<TheOverlay lang>`, y de ahí a los hijos con `provide('ui', ui[lang])` + `inject`. Nunca leer `document` en los Vue, porque los islands se renderizan en el servidor y eso da hydration mismatch.
- `TheOverlayHotspots.vue:110`: el `aria-label` hoy es el id ("athens"). Hay que cambiarlo por el nombre localizado.

## 4. Middleware (solo en `/`)
- `middleware.ts` en la raíz (Vercel Routing Middleware) con `config = { matcher: '/' }`.
- Lógica: si la cookie `lang=es` existe, 307 a `/es`. Si es `lang=en`, sigue. Si no hay cookie y `x-vercel-ip-country` está en la lista, 307 a `/es`. En cualquier otro caso, sigue. Siempre 307, nunca 301.
- Países: AR, BO, CL, CO, CR, CU, DO, EC, ES, GQ, GT, HN, MX, NI, PA, PE, PR, PY, SV, UY, VE.
- Abierto: Brasil (recomendación: dejarlo fuera, allá hablan portugués) y usar `Accept-Language: es` como respaldo para EE. UU. (recomendación: no por ahora).

## 5. Selector de idioma
- Es un enlace `<a hreflang lang>` (EN | ES) en dos sitios: el overlay del globo, cerca del botón Index, y la `monument-bar` de `TheMonumentStory.astro`.
- Al hacer clic guarda `lang=<x>; path=/; max-age=31536000; SameSite=Lax` y navega con recarga completa a la ruta equivalente, calculada desde `location.pathname` al momento del clic (la SPA cambia la ruta).
- Los enlaces fijos a `/` (logo en `TheOverlayBrand.vue`, "← Globe", nav de `TheStage`, 404) usan la raíz del idioma actual.

## 6. SEO
- `TheLayout`: `<html lang>`, `og:locale` (`en_US` / `es_ES`) + `og:locale:alternate`, canonical a la propia versión. Hreflang recíproco y autorreferente: `en` → `path`, `es` → `/es` + `path` (home: `/es`), `x-default` → versión en inglés.
- `jsonLd.ts`: las dos funciones reciben `lang` y usan meta localizada. Agregar `inLanguage`. Las URLs de `ItemList` y `BreadcrumbList` llevan el prefijo.
- Sitemap: `sitemap({ i18n: { defaultLocale: 'en', locales: { en: 'en', es: 'es' } }, serialize })` saca los `xhtml:link` alternos. El `serialize` actual ya deja `/es/` como `/es`.
- Imágenes OG: se reusan los mismos JPG; solo se traduce `ogImageAlt`. Abierto: si `scripts/build-og.mjs` mete texto en inglés en la imagen, decidir si se hace versión en español.

## 7. Inventario de textos a traducir
- `data/home.ts`: title, description, ogImageAlt, intro.
- `data/headline.ts`: 2 líneas + subtítulo.
- `cities/{athens,rome,paris}/meta.ts`: name, monument, title, description, ogImageAlt, intro, country, glimpse, date.
- `cities/{athens,rome,paris}/story.ts`: city, kicker, title, subtitle, paragraphs, cta, facts (label/value), explore (hint, views.label, parts.name/text), label (caption, lines), year/name del timeline. Es el 80 % del trabajo.
- `data/monumentIndex.ts` (`soon`): monument, place, date. Formatos: "a. C." / "d. C.", "c." = "h.", "9th–12th c." = "siglos IX–XII".
- `components/TheMonumentStory.astro`: aria "Page", "← Globe", "Explore", "Or scroll ↓", aria "Museum label" y el resto del archivo después de la línea 90 (sin revisar).
- `components/TheStage.astro`: aria "Destinations", "Globe".
- `layouts/TheLayout.astro`: "Skip to content".
- `pages/404.astro`: title, description, h1, "Back to the globe", aria del logo.
- `overlay/TheOverlayBrand.vue`: aria-label y tagline.
- `overlay/TheOverlayTooltip.vue`: "Tap/Click to visit".
- `overlay/TheOverlayHint.vue`: Drag/Rotate, Pinch/Scroll/Zoom, Tap/Click/Visit.
- `overlay/TheOverlayCityList.vue`: "Destinations".
- `overlay/TheOverlayIndex.vue`: Index, Close the index, placeholder, Region, All, Monuments, Open/Soon, estado vacío (3), "Suggest a monument →", y aria/labels multilínea.
- `overlay/TheOverlaySuggest.vue`: 3 validaciones, error, gracias, intro, títulos, aria, 4 placeholders, labels, Sending…/Send suggestion.
- `pages/api/suggest.ts`: sin texto visible. Opcional: mandar `lang` y guardarlo en una columna del Sheet.
- Voz: español neutro con tú, sin voseo ni vosotros. Misma regla de no hablar de la técnica (en SEO solo "3D interactivo"); los datos se mantienen como en la versión en inglés ya verificada.

## 8. Orden de implementación
1. Config i18n de Astro + `src/i18n/ui.ts` + campos `es` en los tipos.
2. Router, `storyContent` y `pageMeta` con prefijo, más tests de `parseLocation`/`urlFor` con `/es`.
3. Páginas `/es`, layout (lang, hreflang, og:locale), JSON-LD y sitemap.
4. Vue: prop `lang` + provide/inject y reemplazar textos fijos.
5. Selector y cookie.
6. Traducciones: primero meta, home y UI; después las 3 historias.
7. Búsqueda: el haystack de cada entrada junta inglés y español ("Coliseo" y "Colosseum" encuentran lo mismo). Ampliar `tests/monumentIndex.test.ts` con un caso en español.
8. `middleware.ts` y validación en un Preview de Vercel.
9. Actualizar `Civitas/CLAUDE.md` ("Contenido del sitio en inglés" → "en inglés y español"), el checklist de ART-DIRECTION §7 (cada ciudad nueva necesita `meta.es` y `story.es.ts`) y el comentario de `types.ts`.

## 9. Riesgos
- Sin confirmar que el middleware de la raíz corra sobre el `/` prerenderizado de `@astrojs/vercel`. Validar primero en Preview, con cookie `lang=es` y con VPN.
- El router intercepta el cambio de idioma como navegación SPA y el resto del texto quedaría en el otro idioma. Se evita con "idioma distinto = recarga".
- Leer el idioma en Vue desde `document` causa hydration mismatch.
- `/es` contra `/es/` en Vercel: probar que ambos sirvan sin bucle de redirección.
- Fuentes: ñ, á, ¿ y ¡ están en el subset `latin`. Revisar que `cities/*/fonts.ts` cargue `latin`.
- Volumen: las historias son mucho texto. Revisar el sentido histórico y que el español (más largo) quepa en la maqueta.
- Googlebot rastrea desde EE. UU.: ve inglés en `/` y llega a `/es` por hreflang y sitemap. Los crawlers de previews en LATAM verán `/es` en la raíz; está bien.
- Umami ya distingue `/es` por la URL.

## Decisiones abiertas
- Brasil en la lista de países.
- `Accept-Language` como respaldo.
- Imágenes OG en español.
- Slugs en español (recomendación: no).

Fuentes: [Vercel Routing Middleware](https://vercel.com/docs/routing-middleware/getting-started), [Routing Middleware API](https://docs.vercel.com/docs/routing-middleware/api)
