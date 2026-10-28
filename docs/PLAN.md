# WorldHub — plan

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
2. **Globo**: líneas/puntos Natural Earth 110m, hotspots, card, precarga al abrir la card.
3. **Transición**: zoom + fundido a color de cielo, sin long tasks >50 ms, reversa con Atrás.
4. **Atenas**: hora dorada, god rays, polvo, niebla, AO.
5. **Roma**: Coliseo con ático del 4.º nivel, amanecer frío y neblina.
6. **París**: Eiffel de noche con luces ámbar, centelleo con `Intl` Europe/Paris y botón "ver centelleo".
7. **Panel info**: datos, "sabías que", 3 sitios, postal PNG 1080x1350, slider con disolución.
8. **Pulido**: móviles reales, OG por ciudad.

Post-lanzamiento: Chichén Itzá.
