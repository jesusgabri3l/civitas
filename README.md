# Civitas

Atlas interactivo de monumentos en 3D: un globo que lleva a Atenas, Roma y París. Plan completo en [docs/PLAN.md](docs/PLAN.md).

**Diseño y dirección de arte: [docs/ART-DIRECTION.md](docs/ART-DIRECTION.md)** (fuente de verdad para páginas, tipografía, color y modelos 3D).

## Stack

Astro 5 (estático) · TypeScript · Three · GSAP · Sass (7-1) · nanostores · isla Vue para el overlay.

## Scripts

- `npm run dev` — servidor local
- `npm run check` — `astro check`
- `npm run build` — genera `dist/` (4 rutas: `/`, `/athens`, `/rome`, `/paris`)
- `npm run preview` — sirve `dist/`
- `npm test` — vitest (store/router, StageManager, globo, calidad)
- `npm run smoke` — smoke headless del globo con Playwright (requiere `npm run build` antes)
- `npm run og` — regenera las imágenes OG (`public/og/*.jpg`) desde las maquetas. Orden: `npm run build && npm run og && npm run build`
- `npm run build:globe-data` — regenera las costas del globo (Natural Earth 110m)

## Estado

Globo, transición, Atenas, Roma y París construidos; faltan verificar datos, conectar índice y Suggest, y lanzar. Detalle en [docs/STATUS.md](docs/STATUS.md).

Para añadir un monumento: checklist de la sección 7 de [docs/ART-DIRECTION.md](docs/ART-DIRECTION.md).
