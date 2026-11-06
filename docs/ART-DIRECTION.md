# Civitas: dirección de arte

Fuente de verdad del diseño de Civitas. Todo monumento nuevo (página, modelo 3D, tipografía, color) sigue este documento. Si algo
aquí choca con `PLAN.md` o `STATUS.md`, gana este archivo.

Referencia visual: canvas "Civitas — Home + Atenas" (Home v2, índice, Atenas, Roma, París, kit de piezas):
https://claude.ai/artifact/XouKMTg1eobRtPrtiqzido

## 1. La idea

**Civitas es un atlas interactivo de monumentos**, una especie de wiki visual, no una marca de producto. Cada monumento es una
**maqueta de museo bajo un solo foco**, y su historia se cuenta con el scroll **armando, desarmando y transformando el modelo**.

Lema del sistema: **una noche, una luz por ciudad**. El sitio entero es oscuro y de yeso; cada ciudad cambia solo su luz, su
color de acento y su voz tipográfica. El visitante siente que cambió de lugar, nunca que cambió de sitio web.

## 2. Dos capas: Civitas (compartido) y ciudad (propio)

| Capa | Qué incluye | Cambia por ciudad |
|---|---|---|
| **Civitas** | Logo, navegación, etiquetas, línea de tiempo, coordenadas, ficha de museo (datos), estructura de página, yeso de los modelos, fondo oscuro, iconos | Nunca |
| **Ciudad** | Fuente de títulos, color de acento, tono del fondo, motivo decorativo, temperatura y ambiente de la luz | Siempre |

Regla de oro: **si es navegación o un dato, es de Civitas; si es emoción o lugar, es de la ciudad.**

## 3. Tokens compartidos (Civitas)

Código: `src/styles/abstracts/_variables.scss` y `src/engine/stages/globe/palette.ts` (mantener ambos en sincronía).

### Color

| Token | Valor | Uso |
|---|---|---|
| ink | `#0B0B0E` | Fondo del hub (globo) |
| text | `#EDE7DA` | Texto principal en todo el sitio |
| text-muted | `#EDE7DA` al 70 % | Texto secundario, etiquetas |
| amber | `#E8A33D` | Único acento del hub: hotspots, icono del logo, CTA del hub |
| halo | `#F2A13A` | Halo del globo: brillante y pegado al borde, nunca naranja saturado |
| limb line | `#FFDDA8` | Línea fina clara sobre el borde del globo |
| yeso luz / medio / sombra | `#F3EEE4` / `#B9AE98` / `#2B2722` | Los tres tonos de toda maqueta |
| tinta | `#1B1A17` | Línea de contorno de las maquetas |

### Tipografía

| Rol | Fuente | Reglas |
|---|---|---|
| Marca y hub | **Fraunces SemiBold (600), recta** | Logo "Civitas", titular del globo, nombres en el índice y el tooltip. **Sin cursiva** en la marca (la cursiva se lee de moda o boutique). |
| Sistema (chrome) | **JetBrains Mono**, mayúsculas, tracking amplio | Navegación, etiquetas, línea de tiempo, coordenadas, datos de la ficha, botones. **Nunca cambia por ciudad.** |
| Texto de lectura en ciudades | **Cormorant Garamond** | Párrafos de los capítulos. Común a todas las ciudades para no cargar dos fuentes por ciudad. |
| Títulos de ciudad | **Una fuente propia por ciudad** | Ver sección 4. |

Fuentes con `@fontsource` (OFL, self-host). Cada fuente de ciudad se importa y precarga **solo en la ruta de su ciudad**
(`TheLayout.astro`, `cityFonts`).

### Hub (globo)

- Logo arriba a la izquierda: "Civitas" + icono del globo en ámbar; debajo, en mono pequeño, "The interactive atlas of monuments" (se oculta en pantallas angostas y en el logo acoplado de las ciudades).
- Titular centrado arriba en Fraunces 600; subtítulo mono en ámbar.
- Botón **Index · N monuments** (sin atajo de teclado) arriba a la derecha: panel lateral con buscador, filtros por región y lista cronológica. Incluye "Suggest a monument".
- Controles (Drag / Scroll / Click) como lista discreta abajo a la izquierda, sin pastillas: el globo queda libre para interactuar.
- Coordenadas en vivo abajo a la derecha.
- Tooltip de ciudad: tarjeta oscura sutil (`rgba(ink, .78)`, desenfoque, borde al 14 %) para que no se pierda sobre el globo claro.
- En el globo solo hay puntos; con muchos monumentos, los puntos cercanos se agrupan hasta hacer zoom (pendiente).

## 4. Identidad por ciudad

Cada ciudad define exactamente esto, y nada más:

1. **Fuente de títulos**: una sola, con sentido histórico o cultural del lugar. Nada de fuentes "disfraz" (letras griegas o aztecas falsas).
2. **Fondo**: oscuro, luminancia baja (L ≤ 12 %), con un tinte propio (azul noche, pizarra fría, violeta…).
3. **Acento**: un color con contraste ≥ 4.5:1 sobre su fondo para texto pequeño. Marca lo que cambia en la historia, el kicker, el CTA y el progreso de la línea de tiempo.
4. **Motivo decorativo**: un detalle gráfico fino bajo el título (greca, doble línea, enrejado…).
5. **Luz y ambiente**: hora, temperatura y un efecto atmosférico.
6. **Momento compartible**: al menos un efecto del modelo pensado para grabarse en video corto (ver sección 6).

| Ciudad | Título | Fondo | Acento | Motivo | Luz y ambiente | Momento compartible |
|---|---|---|---|---|---|---|
| Atenas (Partenón) | GFS Didot (`ΠΑΡΘΕΝΩΝ`) | Azul noche `#0F1A2A` (suelo `#0B1420`) | Terracota `#C8673E` (figuras rojas) | Greca | Foco cenital cálido, polvo en el haz | El templo se arma y desarma; 1687; policromía |
| Roma (Coliseo) | Cinzel (`COLOSSEVM`, V por U) | Pizarra fría `#141A22` (suelo `#10151C`) | Rojo pompeyano `#DB5F45` | Doble línea; capítulos en números romanos | Amanecer frío, neblina a ras de suelo | El anillo exterior completo frente a la ruina de hoy |
| París (Torre Eiffel) | Bodoni Moda cursiva (`La Tour Eiffel`) | Noche violeta `#121022` (suelo `#0D0C19`) | Champaña `#E9C46A`; luces de la torre en ámbar | Enrejado en X | Noche con estrellas tenues; la torre es la fuente de luz | El centelleo a la hora en punto (`Intl`, Europe/Paris) |

Cada fila sale de un brief aprobado (`docs/briefs/<ciudad>.md`); una ciudad nueva no entra a la tabla hasta la aprobación 1 de la sección 7.

La cursiva de París es una excepción consciente: la regla "sin cursiva" aplica a la marca Civitas, no a la voz de cada ciudad.

En código: `theme` en `src/cities/<ciudad>/meta.ts` → `[data-city]` (colores y fuentes de la página, lo emite `TheLayout`) y `src/cities/<ciudad>/stage/<ciudad>Config.ts` (espejo 3D: fondo y acento, leídos del mismo `theme`, un solo sitio).

## 5. Plantilla de página de monumento

Todas las páginas de monumento comparten la misma estructura. Solo cambian los tokens de la sección 4.

**Inicio (hero)**
- Barra superior: logo Civitas (acoplado) · "CIUDAD · nombre local" en mono · `← GLOBE` y `EXPLORE`.
- Columna izquierda, **sin tarjeta ni caja** (texto directo sobre el fondo oscuro): kicker mono en el acento (lugar · fechas) → título en la fuente de la ciudad → motivo → subtítulo en cursiva (nombre en inglés) → párrafo corto → CTA con borde del acento + "or scroll ↓".
- Modelo a la derecha, sobre su pedestal, bajo el foco.
- **Ficha de museo** abajo a la derecha: nombre (fuente de la ciudad), nombre en inglés y ciudad (cursiva), y en mono: fechas · material, tipo, escala e inventario, coordenadas.
- **Línea de tiempo** abajo, de borde a borde: un punto por capítulo con año y nombre en mono; el acento marca el avance. Reemplaza al indicador de secciones y a la lista de capítulos de la barra superior.

**Capítulos**: siete, en este orden, adaptados a cada monumento:

1. Prólogo: la maqueta.
2. Origen: el material o el lugar (cantera, boceto…).
3. Construcción: quién, cuándo, cómo; el modelo se arma.
4. Momento cumbre o uso.
5. Catástrofe o transformación: el modelo se rompe o cambia.
6. Hoy: restauración, estado actual.
7. Explore: órbita libre y fichas de las partes.

**Responsive** (base común en `_monument-story.scss`, no se toca por ciudad):

| Pantalla | Regla |
|---|---|
| Escritorio (alto ≥ 800 px) | Texto a la izquierda, maqueta a la derecha (`framingX` del entorno). Un degradado suave del fondo detrás de la columna de texto. |
| Laptop (alto < 800 px; < 672 px aún más compacto) | Ritmo más apretado (`--story-top`, `--story-bottom`, `--story-gap`), tipografía que escala con el menor entre ancho y alto, línea de tiempo solo con años, ficha del museo más pequeña (se oculta por debajo de 672 px). Cada capítulo cabe en un viewport. |
| Teléfono y tablet vertical (≤ 48rem) | La cámara sube la maqueta a la mitad superior; el texto empieza en `46svh` sobre el fondo de la ciudad; línea de tiempo solo con puntos (44 px de toque); sin ficha del museo. |
| Explore | El texto queda fijo entre la barra y la línea de tiempo y hace scroll interno si no cabe. |

Las cámaras de cada capítulo (`KEYS` en `<ciudad>Config.ts`) deben dejar la maqueta a la derecha sin pasar bajo el texto: revisarlas al menos en 1440×900, 1366×768 y 390×844.

Cada capítulo es un **estado del modelo**: el texto explica lo que el modelo muestra. Texto a un lado, el modelo encuadrado al lado
opuesto. Contenido del sitio en inglés; datos históricos verificados con fuente antes de publicar.

**Voz del contenido**: el visitante viene por el monumento y su historia, no por la técnica.

- **Contenido de la página** (textos, aria-labels, el índice, el formulario): nunca se habla de cómo está hecho. Nada de "3D",
  "in 3D", "built in code", "real-time", "WebGL", "3D model", "low-poly" ni "rendered". Se habla de lo que el visitante hace y
  descubre: desarmar el templo, verlo pintado, vivir 1687, ver el centelleo. "Maquette" sí se puede usar: es el concepto.
- **SEO** (`title`, meta description, OG): se permite "3D" / "interactive 3D" porque es lo que la gente busca (p. ej.
  `The Parthenon in 3D, Athens — Civitas`). El resto sigue prohibido: "code", "WebGL", "real-time", "low-poly", "rendered",
  "3D model".

## 6. Dirección de arte de los modelos 3D

**Nivel: "maqueta premium"**, ni low-poly plano ni fotorrealista. Debe verse como una maqueta de yeso de museo bien hecha.

### Siempre

- **100 % código**: primitivas de Three.js (`BoxGeometry`, `CylinderGeometry`, `LatheGeometry`, `ExtrudeGeometry`), `InstancedMesh` para todo lo repetido (columnas, arcos, tambores, vigas) y geometría fusionada. Sin modelos importados ni texturas escaneadas.
- **Silueta exacta y proporciones reales** (medidas en metros, de fuentes). Lo que hace reconocible al monumento se modela de verdad (estrías y éntasis, arcos, enrejado); el resto se simplifica.
- **Un solo material de yeso cálido** (`#F4EFE6`, rugosidad ~0.8). Ruido procedural sutil permitido; nada de color salvo el acento.
- **Línea de tinta** fina (`outline` ~0.55, `#1B1A17`), AO suave y sombras suaves estáticas.
- **Pedestal de piedra** gris cálido bajo el modelo (la maqueta se apoya en él).
- **Un foco cenital** con cono suave + relleno hemisférico tenue + contraluz frío muy leve. Haz visible y polvo solo dentro del haz.
- **Fondo del color de la ciudad, sin muros ni horizonte**: el suelo se disuelve en la niebla del mismo color.
- **El acento solo marca lo que la historia cambia**: piezas que se mueven, bordes rotos, piezas que faltan (contorno fantasma), escombros.

### Variaciones permitidas por monumento

- Color del fondo y temperatura de la luz (sección 4).
- Un efecto atmosférico propio (neblina en Roma, estrellas y luces propias en París).
- Más detalle donde la identidad lo pide (el enrejado de la Eiffel, los arcos del Coliseo).
- Color histórico **solo como capítulo** (por ejemplo, la policromía del Partenón), nunca como estado normal.

### Nunca

- Texturas fotográficas, PBR realista o materiales de colores.
- Muros de sala, línea de horizonte dura o paisaje (montañas, ciudad, vegetación).
- Más de un color de acento en la escena.
- Efectos que no cuentan nada (rotaciones decorativas, partículas por todas partes).

### Presupuesto y rendimiento

- Objetivo: ~10-20 draw calls por modelo con instancing.
- Tiers de calidad (`qualityTier.ts`): `low` sin sombras ni polvo; `medium` sombras 1024; `high` sombras 2048 y MSAA.
- Render bajo demanda; sombras estáticas que se redibujan solo cuando algo se mueve.
- Carga partida con `yieldToMain` y todo compilado antes de `activate` (el estado `warmUp` pone en pantalla cada tipo de pieza y color para que nada recompile después).
- **La maqueta se construye por partes**: `createModel` es async y el modelo expone `static async create` con `await yieldToMain()` entre grupos de piezas (copiar `Colosseum.ts`, `Parthenon.ts` o `EiffelTower.ts`). Un modelo que se arma de un tirón congela el hover y el índice mientras carga, sobre todo en móvil. Las texturas procedurales comunes (piedra, cookie) ya están cacheadas y compartidas en `proceduralSurfaces.ts`: no generar otras por ciudad sin cachearlas igual.
- **Aire fuera del pase de tinta**: lo que es luz o aire (haz, rejillas, líneas de dibujo, neblina) va en `SKY_LAYER`; si entra al pase de forma, la tinta y el AO le dibujan bordes duros (pasó con el haz y la rejilla del boceto de París). Lo que es superficie (la hoja de papel) sí entra, con `depthWrite: false` si es transparente. Degradados como la neblina de Roma se hacen en shader, no con `CanvasTexture` (en iOS dejaba manchas).

### Estado y limpieza (nada se queda pegado)

Reglas nacidas de un bug real (nov 2026: la clase `--arriving` se quedaba puesta al volver al globo y retrasaba 1-2 s cada panel que se abría después).

- **Clases de entrada**: una clase de entrada (`--arriving`, `--entering`) con selectores amplios (`> *`, `:not()`, `*`) se quita en cuanto el estado se asienta; si no, su animación se repite en cada hijo que se monte después. Un "solo la primera vez" que debe sobrevivir a que el componente se desmonte vive a nivel de módulo, no en el componente.
- **Lo que se prende, se apaga**: todo lo que un stage o componente enciende (listener, timer, `requestAnimationFrame`, ScrollTrigger, suscripción, clase o atributo en el DOM compartido) se apaga en su `deactivate` / `onBeforeUnmount`. Toda carga async que escribe en el DOM o en el estado lleva un token de generación, para que una respuesta vieja no pise a una nueva.

### Momentos compartibles

Cada monumento necesita al menos uno, pensado para un video de 6 a 10 segundos: desarme o explosión de piezas, antes y después
(ruina o reconstrucción), un dato sorprendente hecho visible (policromía) o un efecto en vivo (el centelleo de París).

### Implementación de referencia: Atenas

Cada monumento tiene la misma forma. El marco común (`src/engine/stages/shared/`) ya resuelve la escena; un monumento solo aporta su
config, su maqueta y su historia, todo en `src/cities/<ciudad>/`.

| Pieza | Archivo | Qué hace |
|---|---|---|
| Marco común | `src/engine/stages/shared/monument.ts` | `MonumentEnvironment` (fondo, niebla, pedestal, foco, haz, polvo, look), `createToonPlaster` (yeso en 3 bandas) y `createMonumentStage`: luces, pedestal, polvo, cámara por capítulo, transición desde el globo, estado que sigue al scroll con amortiguación, Explore (órbita acotada, toque para elegir pieza, vistas). |
| Piezas comunes | `shared/Exhibit.ts`, `BeamDust.ts`, `ContactShadow.ts`, `ExploreOrbit.ts`, `StoryCamera.ts`, `proceduralSurfaces.ts` | Pedestal y suelo sin muros, polvo en el haz, sombra de contacto, arrastre y toque, cámara entre capítulos, texturas de piedra. |
| Config | `src/cities/athens/stage/athensConfig.ts` | Escena (`ATHENS_ENV`), medidas reales, colores (yeso, tintes, acento, policromía), estado (`AthensState`: `explode`, `paint`, `ruin`, `elgin`, `restore`), `stateFor(capítulo, t)`, cámaras por capítulo y Explore (vistas y límites de la órbita). |
| Maqueta | `src/cities/athens/stage/Parthenon.ts` | Una caja unitaria instanciada para todos los bloques, 4 tornos para los tambores (20 caras planas = estrías), equino, frontones extruidos; tintes por instancia. ~8 draw calls. Cada pieza sabe su capa del despiece, qué le pasa en la catástrofe (cae, se recorta, aparece como escombro, queda rota), su color pintado y su parte (ficha de Explore). `setState` es una función pura del estado. |
| Stage | `src/cities/athens/stage/athensStage.ts` | Una llamada a `createMonumentStage` con lo anterior. |
| Meta | `src/cities/athens/meta.ts` | Datos livianos para el cliente: nombre, monumento, SEO, coordenadas, zona horaria, fecha y región del índice, `theme` (fondo, acento, fuentes). Se registra en `src/cities/index.ts`. |
| Historia | `src/cities/athens/story.ts` (tipos en `src/cities/types.ts`, registro en `src/cities/server.ts`) | Hero, capítulos, datos, ficha del museo, motivo, contenido de Explore. |
| Fuentes | `src/cities/athens/fonts.ts` | Solo servidor: CSS de `@fontsource` de la ciudad y los archivos a precargar. |
| Página | `src/components/TheMonumentStory.astro` + `src/views/DestinationView.astro` + `src/pages/[city].astro` | Barra superior, inicio con ficha, capítulos sin tarjeta, Explore, línea de tiempo. Común a todas las ciudades; la ruta sale del registro. |
| Estilos | `src/styles/components/_monument-story.scss` + `theme` en `meta.ts` | El layout emite los tokens `--city-*` de cada ciudad desde su `theme`; el SCSS solo los consume. |

## 7. Checklist: nuevo monumento

Cuando se pida "implementa <monumento>", **la identidad y la historia las decide Jesús**: Claude propone, espera aprobación y
solo después construye. Hay tres puntos de aprobación: identidad y brief (no se escribe código antes del segundo) y la página
construida (el SEO se hace solo después de ese tercero).

### Fase A · Propuesta (sin código)

1. **Investigar** el monumento: fechas, medidas, hechos y momentos de su historia, con fuentes.
2. **Crear el brief** copiando `docs/briefs/_PLANTILLA.md` como `docs/briefs/<ciudad>.md`. Ejemplos llenos: `athens.md`, `paris.md` y `rome.md` (construidos).
3. **Proponer 2 o 3 opciones de identidad** en la tabla del brief (fuente, título, fondo, acento, motivo, luz, momento compartible), cada una con su razón y comprobada con los criterios de abajo.
4. **Parar y presentar las opciones.** ⏸ **Aprobación 1**: Jesús elige (o ajusta) una identidad. Anotarla como "Elegida" en el brief.
5. **Completar el brief** con esa identidad: 7 capítulos, estados de la maqueta, piezas y medidas, Explore, ficha del museo, fuentes y lo que queda por verificar.
6. **Parar y presentar el brief.** ⏸ **Aprobación 2**: Jesús aprueba la historia y la maqueta. Cambiar el estado del brief a `aprobado`.

### Fase B · Construcción (siguiendo el brief aprobado)

7. **Carpeta de la ciudad**: `src/cities/<ciudad>/` con `meta.ts` (datos, `theme`, fecha y región del índice; `title`, `description` y `ogImage` provisionales hasta la fase C; más `es` con los textos en español), `story.ts` y `story.es.ts` (misma forma, español neutro con tú), `fonts.ts` (fuente de títulos con `@fontsource`) y `stage/` (`<ciudad>Config.ts` leyendo `meta.theme`, la maqueta y `<ciudad>Stage.ts`). Copiar la forma de Atenas o París. Añadir la fila a la tabla de la sección 4. Si `stage/` importa un módulo de `three/examples/jsm/...` o de `gsap/...` que ninguna otra ciudad usa, añadirlo a `optimizeDeps.include` en `astro.config.mjs`. Si no, `npm run dev` falla con 504 (Outdated Optimize Dep) la primera vez que se entra a la ciudad.
8. **Registro**: una línea en `src/cities/index.ts` (`cities` y `cityStageLoaders`) y otra por idioma en `src/cities/server.ts` (historias `en` y `es`, y fuentes). Quitar la fila de `soon` en `src/data/monumentIndex.ts` (las filas `soon` llevan su `es`). La ruta, el globo, el índice (y su buscador), el tema CSS y el cielo salen solos; para que el buscador lo encuentre por nombre local o alias, añadir `keywords` en su `meta.ts` (p. ej. nombre local, otras grafías). `tests/monumentIndex.test.ts` comprueba que quedó indexada.
9. **Revisar**: `npm run check`, `npm test`, `npm run build`; probar en escritorio, laptop (1366×768) y móvil (390×844), `prefers-reduced-motion` y teclado. Rendimiento: con la ciudad en pantalla, `__civitas.info().tier` sigue en el nivel inicial tras recorrer todos los capítulos (si baja, la maqueta se pasa del presupuesto de §6); revisar los draw calls de los 7 capítulos con `renderer.info.render.calls`; sin WebGL (Chrome con `--disable-3d-apis`), la historia se lee completa como texto sobre el fondo de la ciudad. Estado: ir y volver al globo 2 o 3 veces (con "← Globe", con el logo y con atrás) y comprobar que el índice abre al instante y que no quedan clases, timers ni listeners de la ciudad (§6, "Estado y limpieza"). Cambiar el brief a `construido`.
10. **Parar y presentar la página.** ⏸ **Aprobación 3**: Jesús prueba la página con `npm run dev` y la aprueba. Hasta entonces no se toca el SEO.

### Fase C · SEO (obligatorio, después de la aprobación 3; ninguna ciudad sale sin esto)

11. **Keywords** (skill `build-seo`, pasos 2-3): autocompletado del monumento en inglés y español (`node ~/.claude/skills/build-seo/scripts/suggest.mjs "<monumento>" --hl en --gl us` y `--hl es --gl co`) y sus filas en `.seo/keywords.md` (búsqueda → intención → página, como hipótesis). Priorizar "cómo era / cómo se construyó / colores originales" sobre "<monumento> 3d" (puzzles y descargas; ver el hallazgo en `keywords.md`). El title y la description salen de ahí. Luego el SERP de 2 o 3 de esas búsquedas (Monid `mrscraper /serp/google`, en/us y es/co; notas en `.seo/serp-notes.md`): las "Otras preguntas" que la historia ya cuenta se responden de forma directa en el texto del capítulo (una frase, con fuente), sin sección de preguntas frecuentes aparte.
12. **Proponer title y description** en la sección 9 del brief: `title` (monumento + ciudad + "3D", 60 caracteres o menos, termina en "— Civitas") y `description` (140 a 160 caracteres, qué hace el visitante con el monumento; ver "Voz del contenido" en §5), y el momento de la maqueta para la imagen OG. ⏸ Jesús los aprueba; pasarlos a `meta.ts`.
13. **Imagen OG** en JPG de 1200×630 (menos de 300 KB) sacada de la maqueta en el momento aprobado: añadir la ciudad a `MOMENTS` en `scripts/build-og.mjs` (capítulo o vista de Explore) y correr, en este orden, `npm run build && npm run og && npm run build` (el script captura sobre `dist/` y deja `public/og/<ciudad>.jpg`; el segundo build lo copia). Mirar la imagen antes de darla por buena.
14. **Comprobar** que la ciudad aparece en `dist/sitemap-0.xml` y en el JSON-LD de su página (monumento y migas Civitas › Ciudad; salen solos del registro). Correr `site-audit` local sobre el build (`npx serve@14.2.4 .vercel/output/static -l 3100`, luego `node ~/.claude/skills/site-audit/scripts/run.mjs --mode local --url http://localhost:3100 --only crawl,a11y`) y dejar en 0 lo que salga de la página nueva. Añadir una entrada en `.seo/changelog.md` (formato de `build-seo`) con la página y sus búsquedas objetivo. Ya desplegada, validarla con el Rich Results Test de Google y la vista previa de enlaces (LinkedIn Post Inspector). Actualizar `docs/STATUS.md`.

### Criterios de identidad (para cada opción propuesta)

- **Fuente de títulos**
  - Existe en `@fontsource` y tiene licencia libre (OFL).
  - Cubre los glifos que el título y los nombres necesitan (acentos, griego, cirílico, etc.).
  - Tiene sentido histórico o cultural del lugar: una tradición tipográfica, inscripciones, la imprenta de la época. Nada de fuentes "disfraz" que imitan una escritura antigua.
  - Se distingue de las fuentes de títulos que ya usan otras ciudades (tabla de la sección 4) y de Fraunces, que es la marca.
- **Fondo**
  - Oscuro (luminancia de 12 % o menos), con un tinte propio.
  - Distinto del de las demás ciudades y del negro del globo (`#0B0B0E`), para que el viaje desde el globo se note.
- **Acento**
  - Contraste de al menos 4,5:1 sobre su fondo para texto pequeño; si el acento puro no llega, proponer también su versión para texto (`accent-strong`).
  - Con tono propio: distinto del ámbar del hub y de los acentos de las otras ciudades.
  - Que se distinga en luminosidad, no solo en tono, de los colores del yeso.
- **Motivo**: uno de los existentes o uno nuevo, dibujable como una línea fina en SVG.
- **Momento compartible**: un efecto del modelo grabable en 6 a 10 segundos, basado en un hecho real del monumento (no un efecto decorativo).
- **Sin cursiva por defecto**: si una ciudad la necesita (como París), explicar por qué en la razón.
