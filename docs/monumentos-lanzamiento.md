# Monumentos para el lanzamiento

Decisión del 2026-11-06: Civitas se lanza con **10 monumentos repartidos por el mundo**, no antes. Nada de esto está empezado.
Cada uno sigue el checklist de `ART-DIRECTION.md` §7: identidad y brief aprobados por Jesús antes de escribir código.

Antes del lanzamiento también hace falta **agrupar los hotspots del globo** (Europa ya tiene 3 ciudades juntas). Ver `STATUS.md`.

## Lista

| # | Región | Monumento | Ciudad | Estado |
|---|---|---|---|---|
| 1 | Europa | Partenón | Atenas | Hecho |
| 2 | Europa | Coliseo | Roma | Hecho |
| 3 | Europa | Torre Eiffel | París | Hecho |
| 4 | EE. UU. (este) | Estatua de la Libertad | Nueva York | Elegido |
| 5 | EE. UU. (oeste) | Golden Gate | San Francisco | Elegido |
| 6 | Sudamérica | Machu Picchu | Cusco (Perú) | Elegido; maqueta topográfica aprobada (excepción en ART-DIRECTION §6) |
| 7 | África (noreste) | Gran Pirámide | Guiza (Egipto) | Elegido |
| 8 | África (oeste) | Gran Mezquita de Djenné | Djenné (Malí) | Elegido |
| 9 | Asia (sur) | Taj Mahal | Agra (India) | Elegido |
| 10 | Asia (este) | Ciudad Prohibida | Pekín | Elegido; enfoque propuesto: solo el eje central (abajo) |

Por qué esta mezcla: EE. UU. queda en dos costas, Sudamérica va al sur para que México no quede pegado a EE. UU., y África y Asia tienen cada una dos puntos separados.

## Por qué funcionan (primera idea, sin verificar todavía)

- **Estatua de la Libertad:** era de cobre y se volvió verde, un "cómo se veía originalmente" como el Partenón. Se armó en Francia, viajó en unas 350 piezas y su esqueleto interior es de Eiffel, así que conecta con París.
- **Golden Gate:** se construyó por tramos (torres, cables y tablero). Su color "International Orange" puede ser el acento.
- **Gran Pirámide:** "cómo se construyó" y su revestimiento blanco original. Las búsquedas son enormes.
- **Taj Mahal:** simetría total, el color que cambia durante el día y la historia de su construcción.

## Cómo encajar los dos difíciles en "maqueta de yeso"

### Machu Picchu

El problema es que su identidad es la montaña, y ART-DIRECTION prohíbe el paisaje.

**Propuesta:** la montaña no es paisaje, es **la maqueta misma**. Sería una maqueta topográfica de capas apiladas, como las de los estudios de arquitectura: la cresta entre Machu Picchu y Huayna Picchu hecha con curvas de nivel extruidas en yeso. Encima van las terrazas (que ya son escalones, perfectas para esas capas) y los muros de piedra.

- El terreno se corta en el borde de la maqueta, sobre el pedestal, y no hay horizonte, así que se sigue viendo como un objeto bajo el foco.
- Desarmar tiene sentido: los muros de sillería encajados sin mortero, piedra por piedra; las terrazas como obra de ingeniería (drenaje bajo el cultivo); los vanos trapezoidales.
- Presupuesto: terrazas y capas fusionadas en pocas geometrías, y casas, muros y vanos con instancing.
- **Excepción aprobada por Jesús el 2026-11-06** y escrita en ART-DIRECTION §6 (Variaciones permitidas).

### Ciudad Prohibida

El problema es que son unos 980 edificios en 72 hectáreas, imposible de modelar entera.

**Propuesta:** modelar de verdad solo el **eje central**: la Puerta del Meridiano y el Salón de la Armonía Suprema sobre su terraza de mármol de tres niveles. El resto del complejo serían bloques bajos de yeso, solo la planta extruida, que se disuelven en la niebla. Es como las maquetas de museo que detallan el corazón y dejan el contexto en volumen.

- La identidad está en los tejados curvos de doble alero (se modelan de verdad) y en los soportes **dougong**: ménsulas de madera encajadas sin clavos. Desarmarlas es el capítulo perfecto para "armar y desarmar".
- Momentos posibles: los dougong separándose en explosión, o las figuras de cerámica en la arista del tejado.
- Acento: el amarillo imperial de las tejas o el bermellón de los muros (uno solo, según §6).
- Presupuesto: ménsulas, columnas, tejas y bloques de contexto con instancing.

## África: la segunda opción, desde otro punto

- **Gran Mezquita de Djenné (Malí, oeste):** el mejor contraste con Guiza.
  - Es de barro, y la maqueta de yeso lo representa muy natural.
  - Las vigas de palma que sobresalen de los muros (*toron*) son a la vez adorno y andamio, perfectas para instancing.
  - Momento: el *Crépissage*, la fiesta anual en que la comunidad recubre la mezquita con barro nuevo.
- **Gran Zimbabue (sur):** muros de piedra seca sin mortero y la torre cónica. Llena el sur del mapa, pero es menos reconocible.

**Elegida: Djenné** (2026-11-06).
