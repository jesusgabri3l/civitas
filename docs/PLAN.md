# Civitas — plan

Atlas interactivo de monumentos en 3D: un globo que lleva a cada monumento; en su página la historia se cuenta con el scroll
armando, desarmando y transformando su maqueta. El diseño (tipografía, color, página, modelos) está en
[ART-DIRECTION.md](ART-DIRECTION.md); este archivo cubre la arquitectura y las fases.

## Decisiones

- Astro 5 estático + TypeScript, Three r170, GSAP (ScrollTrigger), Sass (7-1), nanostores.
- Una isla Vue para el overlay del hub (logo, titular, tooltip, controles, coordenadas, índice). Motor 3D en TS imperativo, sin R3F.
- Rutas estáticas `/` y `/<ciudad>`: cada página prerenderiza su historia (SEO, enlaces directos) y monta la misma app. La navegación interna es SPA (pushState/popstate): al ir de una ciudad a otra el cliente trae la historia prerenderizada de la ruta y la cachea.
- Hosting objetivo: Cloudflare Pages (pendiente de crear el repo remoto y el deploy).
- Idioma: el contenido del sitio en inglés (`<html lang="en">`, metas, aria-labels); la documentación en español.
- Datos históricos verificados con fuente antes de publicar.

## Arquitectura

- `src/engine/Engine.ts`: renderer, pipeline de look (`render/`: pase de escena, G-buffer para AO y contorno, pase final de yeso con grano, viñeta y línea de tinta), render bajo demanda, tiers de calidad (`quality/`).
- `src/engine/stage/StageManager.ts`: ciclo de cada escena load → warm → activate → sleep → dispose, con precarga al abrir el tooltip de una ciudad.
- `src/engine/transition/`: viaje globo ↔ ciudad (zoom, recuadro, fundido al color del fondo de la ciudad, `data/stageSky.ts`).
- `src/engine/stages/globeStage.ts` + `globe/`: el globo (líneas Natural Earth 110m, hotspots, arcos, estrellas, halo).
- `src/engine/stages/shared/`: el marco de toda página de monumento (`createMonumentStage`, pedestal, foco, polvo, cámara por capítulo, Explore).
- `src/engine/stages/<ciudad>/`: config, maqueta y stage de cada monumento. Roma y París aún usan el stage provisional (`createDummyStage.ts`).
- `src/state/`: `appStore` (máquina de estados globo / viaje / ciudad), `router`, `globeStore`, `storyStore` (capítulo, progreso, vista y pieza de Explore).
- `src/story/`: scroll de la historia (`storyScroll.ts`), carga del HTML (`storyContent.ts`), línea de tiempo (`timelineUi.ts`) y Explore (`exploreUi.ts`).
- `src/components/TheMonumentStory.astro` + `src/data/stories/`: la página de monumento y su contenido.

## Fases

0. **Setup** — hecho.
1. **Núcleo** (StageManager, router/store, pipeline, tiers) — hecho.
2. **Globo** — hecho (Home con tipografía Fraunces 600, halo ámbar, índice de monumentos con UI pendiente de conectar).
3. **Transición** globo ↔ ciudad — hecha.
4. **Atenas** — hecha: maqueta del Partenón, 7 capítulos (despiece, armado y policromía, 1687, los mármoles, restauración) y Explore (órbita, vistas, fichas). Falta verificar los datos históricos con fuentes.
5. **Roma** — Coliseo (ART-DIRECTION §4: Cinzel, pizarra fría, rojo pompeyano; momento: el anillo completo frente a la ruina).
6. **París** — Torre Eiffel de noche (Bodoni Moda, noche violeta, champaña; momento: el centelleo a la hora en punto con `Intl`).
7. **Índice y comunidad** — conectar buscador y filtros del índice; backend de "Suggest a monument".
8. **Pulido y lanzamiento** — móviles reales, OG en PNG por ciudad, deploy.

Después: más monumentos con el checklist de ART-DIRECTION §7 (Chichén Itzá, Machu Picchu…).
