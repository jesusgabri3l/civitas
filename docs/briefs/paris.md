# Brief: Torre Eiffel (París)

Estado: `construido`

## 1. Identidad

| | Elegida |
|---|---|
| Fuente de títulos | Bodoni Moda, cursiva (excepción consciente: la regla sin cursiva es de la marca Civitas) |
| Título de la página | `La Tour Eiffel` |
| Fondo y suelo | Noche violeta `#121022` · `#0D0C19` |
| Acento | Champaña `#E9C46A` · texto pequeño `#F0D58A`; las luces de la torre en ámbar |
| Motivo | `truss` (enrejado en X) |
| Luz y ambiente | Noche con estrellas tenues; la torre es la fuente de luz |
| Momento compartible | El centelleo a la hora en punto (Europe/Paris, `Intl`) |
| Razón | Didona francesa del siglo XIX con el aire de la Belle Époque; el dorado de la iluminación nocturna; el hierro pudelado como motivo |

## 2. Historia

| # | id | Línea de tiempo | Maqueta |
|---|---|---|---|
| 0 | prologue | Prologue · The maquette | Reposo, luces encendidas |
| 1 | sketch | 1884 · The sketch | Se desarma, se apagan las luces |
| 2 | construction | 1887–89 · Construction | Se arma por niveles |
| 3 | fair | 1889 · World's Fair | Se encienden las luces |
| 4 | radio | 1909 · Saved by radio | Aparece la antena (`mast`) |
| 5 | today | Today · The sparkle | Centelleo (`sparkle`) |
| 6 | explore | You · Explore | Vistas Today / 1889 / Sparkle / Apart |

## 3-6. Estado, maqueta, Explore, ficha

En código: `src/cities/paris/stage/parisConfig.ts` (`ParisState`: `explode`, `lights`, `sparkle`, `mast`; `stateFor`, cámaras, Explore,
`shadowFar` para un monumento alto), `EiffelTower.ts` (celosía instanciada, arcos, tres niveles, antena, luces, centelleo en vivo) y
`src/cities/paris/story.ts` (textos, partes: piers, arches, levels, shaft, mast; ficha).

Cámara: la torre es vertical; los encuadres son más abiertos y la maqueta queda a la derecha igual que en Atenas.

## 8. Por verificar

El TODO de la cabecera de `src/cities/paris/story.ts`, las medidas de `src/cities/paris/stage/parisConfig.ts` y que el centelleo real solo ocurre de noche
(TODO en `EiffelTower.ts`).
