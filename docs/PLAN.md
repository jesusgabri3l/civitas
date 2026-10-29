# Civitas — plan

Hub de monumentos 3D en una sola página: globo -> Atenas / Roma / París.

## Decisiones

- Astro 5 estático + TypeScript, Three r170+, GSAP, Sass (7-1), nanostores.
- Una isla Vue para el overlay (card, panel, slider). Motor 3D en TS imperativo, sin R3F.
- Rutas estáticas `/`, `/athens`, `/rome`, `/paris` montan la misma app: cambia meta/OG, estado inicial y texto prerenderizado.
- Navegación interna con pushState/popstate, sin View Transitions.
- Panel informativo vía `#info`. Slider de París: "1889 <-> hoy".
- Hosting objetivo: Cloudflare Pages.
- Referencia (solo lectura): `../mediterranean-environment-lab` (model/*, PlasterLook, ScreenLook, shaderChunks, LookPipeline, shared/utils, lab/utils/sun.ts), se porta después de la fase 0.

- **Idioma**: todo el contenido del sitio (datos históricos, 'Did you know', sitios de interés, postal, slider) se escribe en inglés. `<html lang="en">`, `og:locale` en_US, metas, aria-labels, alt y mensajes de carga/error también.

## Fases y criterio de "hecho"

0. **Setup**: `astro check` y `build` pasan; 4 rutas con metas distintas; CI verde.
1. **Núcleo**: StageManager load -> warm -> activate -> sleep -> dispose, router/store y tiers de calidad. Sin fugas tras 10 idas y vueltas.
2. **Globo**: líneas/puntos Natural Earth 110m, hotspots, tooltip anclado al hotspot, precarga al abrirlo. Dirección estética: **Atlas de noche** (ver abajo).
3. **Transición**: zoom + fundido a color de cielo, sin long tasks >50 ms, reversa con Atrás.
4. **Atenas**: hora dorada, god rays, polvo, niebla, AO.
5. **Roma**: Coliseo con ático del 4.º nivel, amanecer frío y neblina.
6. **París**: Eiffel de noche con luces ámbar, centelleo con `Intl` Europe/Paris y botón "ver centelleo".
7. **Panel info**: datos, "sabías que", 3 sitios, postal PNG 1080x1350, slider con disolución.
8. **Pulido**: móviles reales, OG por ciudad.

Post-lanzamiento: Chichén Itzá.

## Dirección estética: Atlas de noche (hub / globo)

- Tipografía (self-host con `@fontsource`, OFL): Fraunces cursiva para marca y nombres de ciudad; JetBrains Mono en mayúsculas con tracking amplio para labels, coordenadas y hora.
- Paleta (tokens en `styles/abstracts/_variables.scss`, espejo en `engine/stages/globe/palette.ts`): fondo `#0B0B0E`, yeso `#E9E2D3` con sombras `#B9AE98`, costas `#1B1A17`, único acento ámbar `#E8A33D`, texto `#EDE7DA` (secundario al 70%). Sin gradientes decorativos.
- Fondo: 3 capas de Points (polvo, estrellas, brillantes), un draw call por capa, en la capa de cielo (fuera del G-buffer). Parallax por profundidad inclinando la cámara hasta 2,5° hacia el puntero, titileo lento, estiramiento leve al hacer zoom, estrella fugaz cada 20-30 s.
- Globo: yeso en dos tonos, rim light cálido fino (cáscara con halo de borde), graticule al 9%, hotspots ámbar con anillo de pulso desfasado por ciudad (CSS), auto-rotación muy lenta tras 5 s en reposo.
- Tooltip sin caja anclado al hotspot: leader line de ~31 px, se voltea por cuadrante, se oculta en la cara oculta. Tinta oscura con halo de yeso (el punto siempre está sobre el globo claro). Móvil: primer tap abre, tap en la etiqueta entra. La lista de ciudades y la nav quedan visually-hidden; el foco de teclado en la lista muestra el tooltip.
- Batería: render continuo solo mientras algo anima. Escritorio pausa lo ambiental a los 60 s sin interacción; móvil y tier low a los 20 s (menos estrellas, sin fugaces). `prefers-reduced-motion`: sin parallax, titileo, fugaces ni auto-rotación. Query de pruebas: `?ambientIdle=<segundos>`.

### Pendiente (después)

- Arcos entre ciudades sobre el globo.
- Relieve (sombreado de terreno) en el globo.
- Al enfocar con teclado una ciudad cuyo hotspot está en la cara oculta, girar el globo hasta ella.
- Rotar `StarField` con la orientación del globo si se quiere que las estrellas deriven con él.
