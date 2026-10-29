# Civitas — estado

Última actualización: 2026-10-28. Último commit: `26f19b8` (Fase 2). Sin remoto todavía (no hay push ni deploy).

## Cómo retomar

- Proyecto: `C:\Users\Lenovo\Desktop\personal\projects\Civitas`. Plan completo en `docs/PLAN.md`.
- Ver local: `npm run dev` (o el preview `civitas-dev` de `projects/.claude/launch.json`).
- Código lo implementa el agente `jesus-gabriel` con la regla "Velocidad primero": sin tests ni pruebas de rendimiento, solo `npm run build` al final. Verificar al final o si Jesús lo pide.
- Commits: solo asunto, sin cuerpo ni co-autor, como `jesusgabri3l`. Commit solo cuando Jesús lo diga, después de que lo pruebe localmente.

## Hecho (fases 0-3)

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

- Fase 3, transición "zoom + fundido directo" (sin commit todavía, sin probar en navegador). Reemplaza el "Atravesar el halo" (relleno ámbar + estrellas procedurales), que se veía plano; nunca hay un color plano en pantalla:
  - Clic/tap en ciudad: `diveIntoCity` (`globeStore`) precarga el stage y gira el globo (0.55 s); resuelve 0.2 s antes de terminar el giro, así la transición solapa. Luego `navigate` -> `Engine.goTo`.
  - Un solo progreso `p` en `Engine` (`TransitionTween`, de `from` a `to`). Curvas puras en `src/engine/transition/timeline.ts`, por modo:
    - `enter` (globo -> ciudad, 1.2 s): zoom del globo con ease-in-out p 0-0.45; swap en 0.4; `mix` 0 -> 1 (smoothstep) entre 0.4 y 0.85; la instantánea del globo se escala 1 -> 1.5 (ease-out) entre 0.4 y 1 alrededor del centro del globo (donde está la ciudad). La ciudad llega con un "settle" por `setEntry` (`cityAway`).
    - Salida (ciudad -> globo): no es un modo aparte, es el viaje `enter` corriendo hacia atras (`direction -1`, arranca en progress 1). En frio, el primer frame orienta el globo de golpe a la ciudad (`restFor`, sirve tambien para deep link), lo pone en la pose del swap, lo renderiza y lo captura como instantanea; ese mismo frame renderiza la ciudad encima (`Engine.captureGlobeForExit`).
    - Ritmo: `ENTER_SECONDS = 1.2 / 0.35` (~3.4 s), igual para entrar y salir.
    - Puntos de ciudad: durante el viaje los HTML se desvanecen (100 ms) y el globo dibuja los suyos en la escena (`globe/HotspotMarkers.ts`), asi quedan en la instantanea y siguen el zoom. El de la ciudad destino va encima.
    - `fade` (reduced motion y ciudad <-> ciudad, 0.3 s): fundido cruzado con la instantánea, sin zoom ni escala.
  - Instantánea: `src/engine/render/FrameSnapshots.ts` guarda el último frame del canvas (ya con look) en dos `FramebufferTexture` (ping-pong, se recrean con el resize). Durante un viaje se copia cada frame; el primer frame del viaje solo dibuja y captura (`primed`) para que el swap tenga qué mostrar. Al swap, la instantánea del stage que sale se dibuja encima del que llega con opacidad `1 - mix`. Solo se renderiza una escena por frame.
  - Si el stage destino no está listo al swap, el viaje queda en pausa en el punto de swap, mostrando el stage que sale (sin color plano ni loader por ahora).
  - Si llega otro pedido o Atrás a mitad, `p` invierte desde donde va (a mitad de un viaje a un tercer stage, vuelve al globo y luego sigue). Si cruza el swap hacia atrás, la instantánea se suelta.
  - Hooks opcionales en `Stage`: `transitionAnchor` (centro en pantalla), `setExit(p, target)`, `setEntry(p, source)`. Solo el globo los implementa; son el gancho para las fases 4-6.
  - Panel de depuración `?scrub` (`src/engine/debug/tripScrubber.ts`): velocidad (pausa..1x), slider de progreso y readout de zoom, mix, snapScale y cityAway.
  - El globo no se duerme (`StageManager.pin`). El governor de calidad no baja el tier durante la transición. Al volver no se repite la intro. El halo (limbo y glow) no cambia durante la transición.
  - Stages placeholder por ciudad siguen siendo `createDummyStage`.

## Siguiente: Fase 4, Atenas

Escena real de Atenas (reemplaza el stage placeholder `athensStage.ts`). Después Roma (5) y París de noche (6).

## Pendiente

- Decidir si se crea el repo remoto en GitHub y el deploy en Cloudflare Pages.
- Slider de París "1889 <-> hoy" (asumido en el plan).
- Fase de pulido:
  - Tests desactualizados o fallando.
  - `scripts/smoke-test.mjs` todavía espera "WorldHub".
  - Renombrar los internos `startWorldHub` y `window.__worldhub`.
  - OG de SVG a PNG.
- Fases 4 (Atenas), 5 (Roma), 6 (París de noche), 7 (panel de info) y 8 (pulido). Después del lanzamiento: Chichén Itzá.
