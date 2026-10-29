# Civitas — estado

Última actualización: 2026-10-28. Último commit: `26f19b8` (Fase 2). Sin remoto todavía (no hay push ni deploy).

## Cómo retomar

- Proyecto: `C:\Users\Lenovo\Desktop\personal\projects\Civitas`. Plan completo en `docs/PLAN.md`.
- Ver local: `npm run dev` (o el preview `civitas-dev` de `projects/.claude/launch.json`).
- Código lo implementa el agente `jesus-gabriel` con la regla "Velocidad primero": sin tests ni pruebas de rendimiento, solo `npm run build` al final. Verificar al final o si Jesús lo pide.
- Commits: solo asunto, sin cuerpo ni co-autor, como `jesusgabri3l`. Commit solo cuando Jesús lo diga, después de que lo pruebe localmente.

## Hecho (fases 0-2)

- Fase 0 y 1: scaffold Astro, StageManager, router pushState, tiers de calidad, sitio en inglés.
- Fase 2, hub (difiere del plan original en varias cosas):
  - Nombre y marca: **Civitas**. Logo en Fraunces blanco con un punto ámbar que es un mini globo.
  - Layout **stacked** en desktop: headline "Every landmark tells a story." arriba y centrado, con "Spin the globe. Pick a monument." debajo (ambos con efecto de escritura y cursor ámbar). El globo es grande, centrado y cortado por abajo, como un planeta asomando. Hay un flag `LAYOUT = 'stacked' | 'split'` en `src/engine/stages/globe/geo.ts`, con su espejo `$layout` en `_variables.scss`.
  - Logo alineado a la primera línea del headline en desktop y centrado en móvil.
  - Globo de yeso con costas Natural Earth 110m, graticule y etiquetas de océano.
  - Halo con dos capas: un borde fresnel ámbar fino (`HALO_RADIUS` 1.09) y un resplandor lejano muy tenue, elíptico, en `materials.ts`.
  - Dither en el pase final (`PlasterLook.ts`) contra el banding de la viñeta.
  - Estrellas en 3 capas con twinkle, deriva lenta y parallax, cubriendo todo el viewport. Estrella fugaz cada 8-15 s.
  - Arcos ámbar rotativos entre ciudades (máximo 3 visibles; al hacer hover se muestran los arcos de esa ciudad).
  - Interacción:
    - Durante la intro el globo no es interactuable.
    - Las ciudades entran escalonadas, con scale, fade y un anillo.
    - Zoom manual acotado entre la vista inicial (zoom in máximo) y el globo completo (zoom out máximo). Rueda en cualquier punto en desktop, pinch en touch. Móvil vertical: 0.85x-1.7x. Sin lift automático.
    - Desktop: hover muestra el tooltip, clic gira hasta la ciudad y navega.
    - Táctil: etiquetas fijas con el nombre de cada ciudad. Tocar el punto abre la tarjeta ("Tap to visit") y tocar la tarjeta navega. Una pista de "nudge" una vez por visita.
    - Hints en pills separadas, abajo a la derecha.

## Siguiente: Fase 3, transición

Al hacer clic en una ciudad, zoom hacia ella y fundido al color de cielo de la escena del monumento, sin recarga. Atrás revierte la transición. Sin long tasks >50 ms. Hoy el clic gira el globo hasta la ciudad (`focusCity` en `globeStore`) y luego llama a `navigate`; la transición se engancha ahí. Las escenas de monumento todavía no existen (fases 4-6), así que la fase 3 puede usar un stage placeholder por ciudad.

## Pendiente

- Decidir si se crea el repo remoto en GitHub y el deploy en Cloudflare Pages.
- Slider de París "1889 <-> hoy" (asumido en el plan).
- Fase de pulido:
  - Tests desactualizados o fallando.
  - `scripts/smoke-test.mjs` todavía espera "WorldHub".
  - Renombrar los internos `startWorldHub` y `window.__worldhub`.
  - OG de SVG a PNG.
- Fases 4 (Atenas), 5 (Roma), 6 (París de noche), 7 (panel de info) y 8 (pulido). Después del lanzamiento: Chichén Itzá.
