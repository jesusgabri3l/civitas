# Estado

Fecha: 30 de octubre de 2026. Fases en [PLAN.md](PLAN.md); diseño en [ART-DIRECTION.md](ART-DIRECTION.md).

## Hecho

- **Hub (globo)**: titular y logo en Fraunces 600 recta, tagline bajo el logo, halo ámbar ceñido con línea crema en el borde, controles abajo a la izquierda, coordenadas abajo a la derecha, tooltip en tarjeta oscura.
- **Índice de monumentos** (botón arriba a la derecha, ⌘K / Ctrl+K) y **Suggest a monument**: interfaz hecha; entrar a Atenas desde la lista funciona.
- **Atenas** (`/athens`): maqueta low-poly del Partenón con 7 capítulos atados al scroll y Explore (arrastrar para girar, tocar una pieza abre su ficha, vistas Today / 432 BC / Painted / Apart).
- **Paris** (`/paris`): maqueta de la Torre Eiffel (celosia instanciada, arcos, tres niveles, antena, luces ambar y estrellas), 7 capitulos atados al scroll (boceto, construccion, 1889, radio 1909, centelleo, Explore con vistas Today / 1889 / Sparkle / Apart). El centelleo corre solo a la hora en punto (Europe/Paris, 5 min) y a demanda en el capitulo Today. Titulo en Bodoni Moda cursiva.
- **Roma** (`/rome`): maqueta del Coliseo (elipse de 80 arcos por nivel, tres arcadas con semicolumnas, ático, anillo interior, gradas, arena sobre hipogeo, velarium, neblina a ras de suelo), 7 capítulos atados al scroll (cantera de Tibur, construcción, juegos del año 80 con toldo, terremoto de 1349, hoy con contrafuertes de 1807 y 1827 en acento, Explore con vistas Today / AD 80 / Apart). Títulos en Cinzel 500.
- **Marco de monumento** (`src/engine/stages/shared/monument.ts`) listo para Roma y los siguientes. Ganó `shadowFar` (monumentos altos) y `update`/`bind` opcionales del modelo (animación en vivo).
- **Proceso para monumentos nuevos**: briefs en `docs/briefs/` (plantilla, Atenas, París y Roma construidos). ART-DIRECTION §7 exige proponer 2 o 3 identidades y esperar dos aprobaciones (identidad y brief) antes de escribir código.
- Proyecto limpio: solo queda el enfoque oficial (sin las variantes `?story=`, `?set=` ni `?design=`, ni el modelo y la página anteriores).

## Pendiente

- Verificar con fuentes los datos de `src/cities/athens/story.ts` (fechas, cifras, policromía, restauración de la columnata norte, piezas de Elgin), `src/cities/paris/story.ts` (ver el TODO de su cabecera), las medidas de `src/cities/paris/stage/parisConfig.ts`, `src/cities/rome/story.ts` (ver su cabecera: cantera de Tibur, cien días de juegos, terremoto de 1349, contrafuertes de 1807 y 1827, restauración 2013-2016) y las medidas de `src/cities/rome/stage/romeConfig.ts`.
- Índice: conectar buscador y filtros por región; estado vacío (`TheOverlayIndex.vue`, TODO).
- Suggest a monument: backend, validación, estados de enviado y error, antispam (`TheOverlaySuggest.vue`, TODO).
- Roma: revisar a ojo con `npm run dev` las cámaras (`KEYS` en `src/cities/rome/stage/romeConfig.ts`; probar 1440×900, 1366×768 y 390×844), la caída del anillo exterior y la posición de los contrafuertes, la neblina y el velarium. Las gradas no se derrumban en la ruina (solo la fachada).
- Paris: revisar a ojo con `npm run dev` las camaras (`KEYS` en `src/cities/paris/stage/parisConfig.ts`), el grosor de la celosia con la linea de tinta y el brillo de las luces; el centelleo real no revisa si es de noche (TODO en `EiffelTower.ts`).
- Transición globo↔ciudad: la salida es la referencia; la entrada es su espejo (círculo con la misma curva, blur invertido, y la captura del globo continúa la curva real del dive, sin salto de velocidad, círculo fijo en el punto de la ciudad del globo al momento del swap). La ciudad nace ya en la pose final del capítulo 0 y el canvas ocupa `100vw` para que la scrollbar de la página no lo reencuadre. Afinar a ojo (`?scrub`): `ENTER_SWAP_AT`, `ENTER_DIVE_END`, `ENTER_DIVE_POWER`, `DIVE_DEPTH_RATIO`, `BLUR_SHARE` en `timeline.ts`, `ENTRY.dolly/yaw/pitch` en `monument.ts`, `MAX_BLUR`/`SOFT_EDGE` en `FrameSnapshots.ts`, `DEPTH_PUSH` en `HotspotMarkers.ts`, `INTRO_*` en `globeStage.ts`.
- Globo: agrupar hotspots cercanos cuando haya muchos monumentos; girar hasta una ciudad enfocada con teclado en la cara oculta.
- Lanzamiento: repo remoto, deploy en Cloudflare Pages, pruebas en móviles reales.
- `npm run smoke` necesita Chromium de Playwright instalado localmente.
