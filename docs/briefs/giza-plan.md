# Plan de implementación: Gran Pirámide (Guiza)

Brief: `docs/briefs/giza.md` (aprobado 2026-11-26). Forma de referencia: `src/cities/san-francisco/`. Marco: `src/engine/stages/shared/monument.ts`.

## Archivos

**Crear** en `src/cities/giza/`:
- `meta.ts` (+ `es`): theme `#241A0C`, acento `#5B8FD9`, Rokkitt 600, `keywords` (Khufu, Cheops, Keops, Akhet Khufu, Gran Pirámide). Title, description y OG provisionales hasta la fase C.
- `story.ts`, `story.es.ts`: hero, los 7 capítulos y Explore del brief §1-§6.
- `fonts.ts`: `@fontsource/rokkitt` 600 (instalar el paquete).
- `stage/gizaConfig.ts`: `SCALE`, medidas, `GIZA_ENV`, `PLASTER` y `CASING_PLASTER`, `COLORS`, `GizaState`, `REST`, `WARM_UP`, `stateFor`, `finalStateFor`, `VIEWS`, `EXPLORE`, `KEYS`/`HOLD`.
- `stage/GreatPyramid.ts`: `static async create` con `yieldToMain` entre grupos, como `GoldenGateBridge.ts`.
- `stage/gizaStage.ts`: copia de `sanFranciscoStage.ts`.

**Tocar**:
- `src/cities/index.ts` y `src/cities/server.ts` (en y es).
- `src/data/monumentIndex.ts`: quitar la fila `soon`.
- `docs/ART-DIRECTION.md` §4: fila de la ciudad.
- `astro.config.mjs`: solo si el stage importa un módulo nuevo de `three/examples` (no debería).

## Ejes y escala

- x = este, −z = norte, y = 0 es la base, sobre el pedestal.
- Medidas en metros reales; la raíz se escala con `SCALE` para que la altura quede en ~40-45 unidades, como las otras ciudades.
- Plano del corte N-S en **x = +7,3 m** (los corredores van ~7 m al este del eje). Confirmar la cifra en Maragioglio y Rinaldi o en Dormion.

## Modelo: 6 draw calls

1. **Cajas** (`InstancedMesh`, caja unitaria, yeso común): bandas del núcleo (50 × 2 mitades partidas en el plano del corte), piezas interiores (losas de granito de la cámara del rey y de las 5 de descarga, muros de la Gran Galería), bloques de las tres canteras, escombro del revestimiento, túnel de los ladrones y las pocas piedras de revestimiento al pie de la cara norte. Tintes por instancia; partes de Explore por `instanceId`.
   - Banda i: alto h = 146,6/50 ≈ 2,93 m; retranqueo h/tan(51°50′40″) ≈ 2,30 m. La caja mide lo de la línea de pendiente en lo alto de la banda menos el grosor del revestimiento (~1-1,5 m), así el escalón asoma con luz rasante.
   - Bandas por encima de 138,5 m (la punta perdida) a escala 0 cuando `strip` = 1.
2. y 3. **Revestimiento este y oeste**: dos `BufferGeometry` fusionadas, una por mitad, con `CASING_PLASTER`. No se puede instanciar (cada banda es un tronco con proporción tapa/base distinta). Cada banda es un hexaedro de 8 vértices recortado en el plano del corte; la última tiene tapa 0 y es la punta.
   - Vértices ordenados de abajo hacia arriba: `casing` y `strip` se resuelven con `geometry.setDrawRange(0, bandas × índices por banda)`.
   - Frente en acento con `vertexColors`: en cada `setState` se repinta el rango de la banda que se coloca (una variante de shader más, cubierta por `WARM_UP`).
4. **Cara del corte**: `ExtrudeGeometry` de un `Shape` en el plano y-z con el contorno escalonado.
   - Todos los pasajes van como **una sola muesca del contorno**, no como agujeros: descendente desde la cara norte, ascendente, Gran Galería en falsa bóveda, pasaje horizontal a la cámara de la reina, antecámara y cámara del rey. (`Shape.holes` no admite agujeros que toquen el contorno ni entre sí.)
   - Las 5 cámaras de descarga, como agujeros sueltos.
   - Extrusión D ≈ 3 m reales; la mitad que se queda termina D antes del plano, así los huecos son nichos con fondo (sin z-fighting) y la tinta y el AO los dibujan.
   - Fondos de la galería y de la cámara del rey: instancias de la malla de cajas un pelo por delante del fondo del nicho (raycast de Explore y `applyExploreFocus` sin lógica extra).
   - Test (Vitest): área triangulada con `ShapeUtils.triangulateShape` = área del contorno − agujeros (earcut pierde triángulos en silencio si el polígono se cruza).
5. **Líneas** en `SKY_LAYER`, una `LineSegments` con `LineBasicMaterial`: cuadrado de la base, 4 marcas cardinales, contornos del Gran Vacío y del corredor norte (discontinuas como segmentos cortos, sin `LineDashedMaterial`), ε por delante de la cara del corte. Verificar la profundidad de `SKY_LAYER` en las líneas de SF o París.
6. **Arena**: plano con shader de degradado en `SKY_LAYER` (copiar la neblina de Roma o `MIST` de SF).

Con el marco (pedestal, sombra de contacto, haz, polvo) la escena suma ~11-13 llamadas. Plan B si el polígono del corte da guerra: corredores como líneas sobre una cara lisa.

## Material del revestimiento

`MeshToonMaterial` no tiene rugosidad ni especular. El "brillo" aprobado se hace con un segundo yeso toon (`CASING_PLASTER`): banda de luz más ancha y tono un poco más claro, sin color. Precedente: `skinPlaster` de Nueva York. No suma draw calls.

## Estado (`GizaState`)

`plateau`, `quarries`, `courses`, `casing`, `strip`, `tunnel`, `section`, `void` (brief §3).
- `REST` y Explore `today`: `courses` 1, `casing` 1, `strip` 1, `tunnel` 1, `section` 0, resto 0.
- `WARM_UP`: todo en 0,5 y `tunnel` 1.
- `section`: la mitad que se retira (núcleo, revestimiento e interiores) se desliza decenas de metros hacia afuera y baja a escala 0 al final. Sin transparencia.
- `courses`: las piezas interiores salen en acento cuando la banda llega a su nivel; asoman sobre la banda superior y la siguiente las tapa.

## Luz (`GIZA_ENV`)

- Foco desde +x (este), elevación ~25-30° (más bajo, el cono queda casi horizontal). Color cálido de amanecer.
- `shadowFar` hasta la distancia del foco al modelo. Probablemente `cookie: false`.
- Contraluz frío leve desde −x. `dust` con `baseAlpha` bajo. `framingX` ~0,24.
- El foco no cambia por capítulo; ajustar a ojo que la cara norte quede en sombra larga.

## Explore

- `orbit.yaw: Infinity`. Vistas `today`, `cased` (`strip` 0), `inside` (`section` 1, `void` 1).
- `pick`: `instanceId` en las cajas; el revestimiento da `casing`; la cara del corte da `core`, salvo dentro del rectángulo de la galería o de la cámara del rey.
- `EXPLORE_FOCUS` sin cambios.

## Orden

1. `meta`, `fonts`, registro e índice (página en texto).
2. Config y núcleo.
3. Revestimiento con `drawRange`.
4. Cara del corte y su test.
5. Interiores, canteras, escombro y túnel.
6. Líneas y arena.
7. `stateFor` y cámaras, a ojo en 1440×900, 1366×768 y 390×844 (revisar capítulos 3 y 5).
8. `story`, `story.es` y Explore.
9. Checklist §7, paso 9 (`renderer.info.render.calls` en los 7 capítulos).

## Decidido (Jesús, 2026-11-26)

- En el capítulo 5 se retira la **mitad este** y la cámara mira desde el este (la cara del corte recibe la luz del amanecer). Actualizar brief §2 cap. 5, §3 `section` y la vista `inside`.
- La cámara subterránea va **solo en el texto**, no en el corte.

## Desvíos al implementar (2026-11-26)

- Cara del corte: celdas trapezoidales (`stage/section.ts` + `gizaGeometry.ts`) en vez de `ExtrudeGeometry` con `Shape`. La red de pasajes toca el contorno y se ramifica: haría falta una unión booleana a mano. Las celdas restan los huecos del contorno sin unión y el test (`tests/gizaSection.test.ts`) compara el área con una muestra de puntos.
- Revestimiento: una sola malla, no dos. Nunca se ve con el corte abierto (`strip` es 1 siempre que `section` > 0).
- El túnel de los ladrones es un marco (dos jambas y un dintel) en la cara norte, no un hueco: el núcleo son cajas macizas.
- Punta perdida: el núcleo de hoy queda en 47 bandas (137,8 m), no en 138,5.

## Abierto
- Desplazamiento exacto de los corredores respecto al eje.
- Tonos de `CASING_PLASTER`, a ojo.
