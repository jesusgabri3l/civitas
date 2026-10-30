# Civitas

Atlas interactivo de monumentos en 3D: un globo que lleva a cada monumento, donde la historia se cuenta armando y desarmando su
maqueta con el scroll.

## Antes de diseñar o construir algo

- **Lee `docs/ART-DIRECTION.md` primero.** Es la fuente de verdad del diseño: capas compartidas y por ciudad, tokens, plantilla de página, dirección de arte de los modelos 3D y el checklist para añadir un monumento.
- Si te piden "implementa <monumento>", sigue el checklist de la sección 7 de ese archivo. **Nunca elijas la identidad (fuente, colores, motivo, momento) ni la historia por tu cuenta**: propón 2 o 3 opciones en un brief (`docs/briefs/_PLANTILLA.md`) y espera la aprobación de Jesús antes de escribir código. Hay dos aprobaciones: identidad y brief completo.
- Arquitectura y fases: `docs/PLAN.md`. Estado y pendientes: `docs/STATUS.md`. Si chocan con `ART-DIRECTION.md`, gana `ART-DIRECTION.md`.

## Stack y comandos

Astro 5 (estático) · TypeScript · Three · GSAP · Sass (7-1) · nanostores · isla Vue para el overlay del hub.

- `npm run dev`, `npm run check`, `npm test`, `npm run build`, `npm run preview`.

## Convenciones

- Contenido del sitio en inglés (textos, metas, aria-labels). Documentación y comentarios de diseño en español.
- En el contenido de la página nunca se habla de la técnica (ni "3D", "built in code", "real-time", "WebGL", "low-poly"…): solo del monumento y lo que el visitante hace con él. En el SEO (title, meta description, OG) se permite solo "3D" / "interactive 3D" como palabra de búsqueda; el resto sigue prohibido (ART-DIRECTION §5, "Voz del contenido").
- Datos históricos verificados con fuente antes de publicar.
- Colores y fuentes solo desde tokens: `src/styles/abstracts/_variables.scss` (CSS) y `src/engine/stages/globe/palette.ts` / `stages/<ciudad>/<ciudad>Config.ts` (3D). Mantener ambos lados en sincronía.
- Modelos 3D 100 % en código, con instancing y presupuesto de draw calls (sección 6 de `ART-DIRECTION.md`).
- La referencia de página y modelo es Atenas (`src/engine/stages/athens/`, `src/data/stories/athens.ts`); el marco común está en `src/engine/stages/shared/monument.ts`. Ver la tabla de la sección 6 de `ART-DIRECTION.md`.
- `capturas-proceso/` guarda capturas de exploraciones anteriores (material del proceso); no es referencia de diseño.
- UI pendiente de conectar: el buscador y los filtros del índice (`src/overlay/TheOverlayIndex.vue`) y el formulario "Suggest a monument" (`src/overlay/TheOverlaySuggest.vue`) tienen la interfaz hecha pero no la lógica (ver los TODO).
