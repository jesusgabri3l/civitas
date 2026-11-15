# Brief: Estatua de la Libertad (Nueva York)

Estado: `construido` (2026-11-06; aprobación 3 dada el 2026-11-14; SEO fase C hecha el 2026-11-14; hoy = el verde característico, casi el acento; ajustado por Jesús tras verlo: el tinte suave dejaba tres colores en el cambio)
Aprobado por: Jesús (identidad A, con B como capítulo de construcción) · Fecha: 2026-11-06

## 1. Identidad (ART-DIRECTION §4)

| | A · Pátina | B · Piel y esqueleto | C · Faro |
|---|---|---|---|
| Fuente de títulos | Libre Caslon Display (OFL) | Old Standard TT (OFL) | Rokkitt (OFL) |
| Título de la página | `Liberty Enlightening the World` | `La Liberté éclairant le monde` | `Statue of Liberty` |
| Fondo · suelo | Verde abismo `#0B1716` · `#081110` | Sepia de taller `#17120C` · `#110D09` | Ladrillo de fuerte `#1A100E` · `#130B0A` |
| Acento (contraste sobre el fondo) | Verdigrís `#5FBF9F` (8,2:1) | Azul de plano `#7FB2E5` (8,3:1) | Luz de arco eléctrico `#9FD3FF` (11,8:1) |
| Motivo | Nuevo: los 7 rayos de la corona en abanico | Nuevo: línea de remaches (puntos) | Nuevo: estrella de 11 puntas (Fort Wood) |
| Luz y ambiente | Amanecer frío, bruma salina a ras de suelo | Taller: foco cálido y luz de claraboya, polvo de metal | Noche; la antorcha es la fuente de luz |
| Momento compartible | La piel pasa del cobre recién armado (1886) al verde de hoy | La mitad de adelante de la piel desaparece con un corte limpio y deja ver el esqueleto de hierro de Eiffel | La antorcha se enciende y su haz barre el puerto |
| Razón | Caslon es la letra de la imprenta colonial (la de la Declaración de Independencia, cuya fecha lleva la tablilla). El verde es lo que todos reconocen, y que fuera cobre es el "cómo se veía" del monumento, como la policromía de Atenas. | Didona francesa del siglo XIX: la estatua se hizo en París, en los talleres Gaget-Gauthier. El esqueleto es de Eiffel y conecta con la ciudad de París ya construida. | Fue un faro oficial de 1886 a 1902. Slab serif de los carteles estadounidenses de la época. Se apoya en Fort Wood, un fuerte de 1811 con forma de estrella. |

Contra los criterios de §7:

- **Fuentes**: las tres existen en `@fontsource` con OFL y son distintas de GFS Didot, Cinzel, Bodoni Moda y Fraunces.
- **Fondos**: todos con una luminancia de 0,6 a 0,7 % y un tinte distinto del de las otras ciudades y del globo.
- **Acentos**: los tres pasan 4,5:1 sin necesitar `accentStrong`. Su luminancia (42 a 61 %) queda lejos del yeso (87 %).
- **Cobre como color**: en A, el cobre es color histórico **solo como capítulo** (§6).

**Elegida: A · Pátina** (2026-11-06), con el esqueleto de B como capítulo de construcción.

Nota: el "título de la página" es el titular grande de la historia (como `COLOSSEVM`), no el `<title>` del SEO, que se define aparte en la fase C.

## 2. Historia: 7 capítulos

| # | id | Línea de tiempo | Título (borrador, en) | Qué pasa en la maqueta | Cámara |
|---|---|---|---|---|---|
| 0 | prologue | Prologue · The maquette | Liberty Enlightening the World | Reposo: la estatua de hoy (pátina) sobre el pedestal y el fuerte | Hero 3/4, maqueta a la derecha, encuadre alto |
| 1 | skeleton | 1880–81 · Eiffel's skeleton | A skin on a skeleton | Un plano barre la mitad de adelante de la piel y deja ver el pilón y la armadura de Eiffel; la piel pasa a color cobre (`skin`, `copper`) | Cerca, a la altura del torso, de lado |
| 2 | paris | 1884 · Paris | Built in Paris first | La piel se cierra: la estatua completa en cobre nuevo, sin pedestal (se presentó en París el 4 de julio de 1884) | Cuerpo entero, de frente |
| 3 | crates | 1885 · 350 pieces | Shipped in 214 crates | La estatua se desarma por capas (`explode`) y el pedestal de Hunt sube sobre el fuerte (`pedestal`, la campaña de Pulitzer) | Abierta, 3/4 desde arriba |
| 4 | dedication | 1886 · Dedication | A lighthouse for the harbor | Se arma sobre el pedestal y se enciende la antorcha (`torch`); fue faro hasta 1902 | Contrapicado hacia la antorcha |
| 5 | patina | Today · The patina | Why she turned green | El cobre se vuelve verde de abajo arriba (`copper` → 0). **Momento compartible** | Cuerpo entero, 3/4 |
| 6 | explore | You · Explore | Now, you | Vistas de Explore | Pose libre acotada |

## 3. Estado de la maqueta

| Estado | Qué hace | Capítulos |
|---|---|---|
| `skin` | Corte limpio de maqueta de museo: un plano barre de adelante hacia el eje (el lado que mira la cámara del capítulo 1) y quita la mitad de adelante de la piel, con geometría (triángulos colapsados), y deja ver el esqueleto y el interior de la mitad de atrás | 1 (vuelve a 0 en el 2) |
| `copper` | 1 = cobre nuevo, 0 = pátina de hoy; el cambio recorre la figura de abajo arriba | 1 en los capítulos 1 a 4; baja en el 5 |
| `explode` | Separa por capas: antorcha y brazo, cabeza y corona, cuerpo por anillos, esqueleto | 3 |
| `pedestal` | Sube el pedestal sobre el fuerte (0 = solo el fuerte en estrella) | 0 en los capítulos 1 y 2; sube en el 3 |
| `torch` | Enciende la llama (luz propia, como las luces de París) | 4 a 6 |

**Decisión para Jesús (color):** el cobre es color histórico **solo como capítulo** (§6). Para el estado de hoy propongo **yeso con un tinte verdigrís suave** (no el acento pleno), y el acento pleno solo en el borde que avanza durante el cambio del capítulo 5. Así, en reposo sigue siendo una maqueta de yeso.

## 4. Maqueta

- **Medidas reales** (NPS, *Statue Statistics*):
  - Del suelo a la antorcha: 92,99 m.
  - Del suelo a lo alto del pedestal: 46,94 m.
  - De la base de la estatua a la antorcha: 46,05 m.
  - Del talón a la cabeza: 33,86 m.
  - Tablilla: 7,19 × 4,14 × 0,61 m, con `JULY IV MDCCLXXVI`.
  - Corona: 7 rayos y 25 ventanas.
  - Piel: 2,37 mm (3/32 in).
- **Piezas** → primitiva → instancias → estado:
  - Fuerte en estrella → `ExtrudeGeometry` (estrella de 11 puntas) → 1 → —
  - Pedestal de Hunt → cajas y troncos, con las logias como cajas instanciadas → ~3 → `pedestal`
  - Piel del cuerpo y la túnica → `LatheGeometry` cortado en anillos y gajos; cada gajo es una lámina instanciada → 1 InstancedMesh → `skin`, `explode`, `copper`
  - Brazo, antorcha y llama → cilindros y torno; la llama es emisiva → 2 → `explode`, `torch`
  - Cabeza y corona → esfera deformada y 7 rayos (conos instanciados) → 2 → `explode`, `copper`
  - Tablilla → caja con bisel → 1 → `copper`
  - Pilón de Eiffel → 4 montantes y diagonales (cajas instanciadas) → 1 → `skin`
  - Armadura secundaria → barras planas instanciadas que van del pilón a la piel → 1 → `skin`
- **Detalle de identidad**: la silueta (brazo alzado, corona de 7 rayos, tablilla en la mano izquierda) y los pliegues de la túnica en el perfil del torno.
- **Figura importada (2026-11-06)**: la figura procedural se descartó. La estatua es `public/models/liberty.glb` (fuente: `docs/liberty.blend`), modelo "Statue Of Liberty" de gravityjack en Sketchfab, **CC BY 4.0**: https://sketchfab.com/3d-models/84094e8d5e724b5c882cf576ca12e44e. Crédito visible al pie de Explore (en y es). Se corta en anillos por altura para `explode`; `skin` es el corte por plano y `copper` el color por vértice; el pedestal, el fuerte, el pilón, la armadura, la llama y la bruma siguen en código.
- **Riesgo (resuelto con el GLB)**: era la primera figura humana de Civitas. Con primitivas, la túnica sale bien con torno y pliegues extruidos, pero la cara y las manos quedan simplificadas; a escala de maqueta se aceptan.
- **Qué marca el acento**: el esqueleto en el capítulo 1, el pedestal mientras sube en el capítulo 3 y el frente del cambio de color en el capítulo 5.
- **Presupuesto**: ~12-15 draw calls.
- **Cámara**: muy vertical (93 m con el pedestal, más alta que ancha, como París). Usar `shadowFar`, encuadres abiertos y la maqueta a la derecha.

## 5. Explore

- **Vistas**: `today` · Today · pátina y antorcha encendida; `1886` · 1886 · cobre nuevo; `skeleton` · Skeleton · piel cortada (la mitad de adelante, vista desde el lado del capítulo 1; el visitante puede girarla).
- **Partes con ficha**:
  - `torch` · The torch: la llama de hoy es una réplica con pan de oro de 1986; la original está en el museo de la isla desde 2019.
  - `crown` · The crown: siete rayos y 25 ventanas.
  - `tablet` · The tablet: `JULY IV MDCCLXXVI`, la fecha de la Declaración de Independencia.
  - `skin` · The skin: láminas de cobre de 2,4 mm martilladas a mano (repujado).
  - `pylon` · Eiffel's pylon: un esqueleto flexible; la piel cuelga de él y no se sostiene sola.
  - `pedestal` · The pedestal: de Richard Morris Hunt; la obra se rescató con la campaña de donaciones de Pulitzer en 1885.
  - `fort` · Fort Wood: el fuerte en estrella de 1811 sobre el que se apoya.

## 6. Ficha del museo

- Nombre: `Liberty Enlightening the World` (inglés; en francés, *La Liberté éclairant le monde*)
- Leyenda: Statue of Liberty · New York
- Líneas: 1875–1886 · Copper over an iron frame · 93 m to the torch · Scale 1:300 · Inv. Nº 1886 · 40.6892° N · 74.0445° W

## 7. Fuentes

- NPS, *Statue Statistics* (alturas, piel, corona, tablilla): https://www.nps.gov/stli/learn/historyculture/statue-statistics.htm
- NPS, *Liberty Island: A Chronology*: https://home.nps.gov/stli/learn/historyculture/liberty-island-a-chronology.htm
  - Fuerte de 1808-1811.
  - La mano con la antorcha en Filadelfia en 1876 y la cabeza en París en 1878.
  - Eiffel contratado en 1879 y el primer remache en 1881.
  - Presentación en París el 4 de julio de 1884.
  - Pulitzer y la llegada el 17 de junio de 1885.
  - Dedicación el 28 de octubre de 1886.
  - La restauración de 1984-1986, con la antorcha nueva de pan de oro.
- NPS, *History Continued* (piel de 2,37 mm, pesos): https://www.nps.gov/stli/learn/historyculture/history-continued.htm
- NPS, *Constructing Liberty* (pilón y armadura flexible; 214 cajas): https://www.nps.gov/museum/exhibits/statue_liberty/constructing_liberty.html
- Library of Congress, 2017 (350 piezas, 214 cajas, fragata Isère): https://blogs.loc.gov/loc/2017/06/this-day-in-history-statue-of-liberty/
- Copper Development Association (unas 300 láminas, repujado): https://archive.copper.org/education/liberty/liberty_design3.php
- USCG, *Statue of Liberty Light* (faro de 1886 a 1902): https://history.uscg.mil/Browse-by-Topic/Assets/Land/All/Article/1991126/statue-of-liberty-light

## 8. Verificado (2026-11-06)

- **Pátina**: el NPS (FAQ, https://www.nps.gov/stli/faqs.htm) dice que tardó unos 30 años y que en 1886 era marrón, "como un centavo". La ACS dice que se completó hacia 1906 y la New-York Historical Society, hacia 1920. **En el texto**: "about thirty years" (NPS), sin año exacto.
- **Fin como faro**: el 1 de marzo de 1902 (USCG). El NPS fecha en 1901 el paso al War Department. **En el texto**: "until 1902".
- **Llegada**: la Isère entró al puerto el 17 de junio de 1885 (cronología del NPS, Statue of Liberty-Ellis Island Foundation). El 19 es la descarga en la isla. **En el texto**: 17 de junio.
- **Fort Wood**: estrella de 11 puntas, construida de 1808 a 1811 (NPS, https://www.nps.gov/places/000/fort-wood.htm). FortWiki dice 12 puntas, pero es la única fuente que lo dice.
- **Caslon en el broadside de Dunlap**: confirmado (Penn Libraries, https://www.library.upenn.edu/events/typography-independence/makers-blog/printing-and-type, y Fonts In Use).
- **Modelo**: brazo derecho de 12,80 m y cabeza (del mentón al cráneo) de 5,26 m (NPS, Statue Statistics).

## 9. SEO

Hecha el 2026-11-14 (aprobación 3 dada ese día). Búsqueda principal: el color original (hueco en Google, solo blogs; en español poco contenido de autoridad); secundaria: cómo se construyó. Title: "The Statue of Liberty in 3D — Civitas" / "La Estatua de la Libertad en 3D — Civitas". Description en `meta.ts` (en/es). OG: pátina a mitad de camino (capítulo 5, t 0,5). Notas en `.seo/keywords.md`, `.seo/serp-notes.md` y `.seo/changelog.md`.
