# WorldHub

Hub de monumentos 3D: un globo que lleva a Atenas, Roma y París. Plan completo en [docs/PLAN.md](docs/PLAN.md).

## Stack

Astro 5 (estático) · TypeScript · Three · GSAP · Sass (7-1) · nanostores · isla Vue para el overlay.

## Scripts

- `npm run dev` — servidor local
- `npm run check` — `astro check`
- `npm run build` — genera `dist/` (4 rutas: `/`, `/athens`, `/rome`, `/paris`)
- `npm run preview` — sirve `dist/`
- `npm test` — vitest (store/router, StageManager, calidad)
- `npm run smoke` — smoke headless con Playwright (requiere `npm run build` antes)

## Estado

Fase 1 (núcleo: StageManager, router/store, pipeline plaster, tiers) con stages dummy. Sin despliegue ni repo remoto todavía.
