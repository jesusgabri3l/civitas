import type { MonumentStory } from '../types';

/**
 * Atenas: la historia del Partenón en español (misma forma que `story.ts`; los datos son los de la versión en inglés ya verificada).
 * Español neutro con tú, sin hablar de la técnica.
 */
export const story: MonumentStory = {
  city: 'Atenas',
  cityLocal: 'Αθήναι',
  cityLocalLang: 'el',
  motif: 'greek-key',
  hero: {
    id: 'prologue',
    year: 'Prólogo',
    name: 'La maqueta',
    kicker: 'Acrópolis de Atenas · 447–432 a. C.',
    title: 'ΠΑΡΘΕΝΩΝ',
    titleLang: 'el',
    subtitle: 'El Partenón',
    paragraphs: ['El templo de Atenea Partenos, levantado en mármol pentélico sobre la ciudad. Desármalo pieza por pieza y sigue su historia hasta hoy.'],
    cta: 'Recorre el templo',
  },
  chapters: [
    {
      id: 'pentelikon',
      year: 'h. 447 a. C.',
      name: 'Pentélico',
      kicker: '02 — Monte Pentélico',
      title: 'Cortado de la montaña',
      paragraphs: [
        'Cada bloque salió de las canteras del monte Pentélico, a unos 16 km al noreste de la Acrópolis. Su mármol blanco y fino, con un rastro de hierro, toma con el tiempo un tono miel cálido.',
        'Los tambores, las vigas y las losas del techo se desbastaban en la cantera, se arrastraban hasta la ciudad y se terminaban en obra. Aquí está el templo, desarmado en las piezas con las que se hizo.',
      ],
      facts: [
        { label: 'Cantera', value: 'Pentélico' },
        { label: 'Distancia', value: '~16 km' },
        { label: 'Piedra', value: 'Mármol' },
      ],
    },
    {
      id: 'pericles',
      year: '447–432 a. C.',
      name: 'Pericles',
      kicker: '03 — Pericles',
      title: 'Levantado en quince años',
      paragraphs: [
        'Bajo Pericles, los arquitectos Ictino y Calícrates trazaron el templo y Fidias dirigió su escultura. Cada una de las 46 columnas exteriores es una pila de tambores de mármol.',
        'Se consagró en 438 a. C. y sus esculturas estaban terminadas en 432 a. C. No era blanco: como otros templos griegos, sus detalles estaban pintados, y en 2023 se hallaron restos de azul egipcio en los ropajes de las figuras del frontón.',
      ],
      facts: [
        { label: 'Arquitectos', value: 'Ictino · Calícrates' },
        { label: 'Escultura', value: 'Fidias' },
        { label: 'Columnas', value: '8 × 17' },
      ],
    },
    {
      id: 'explosion',
      year: '1687',
      name: 'La explosión',
      kicker: '04 — 1687',
      title: 'La explosión',
      paragraphs: [
        'En 1687 el Partenón ya había sido iglesia y luego mezquita, y la guarnición otomana guardaba su pólvora dentro.',
        'Durante el asedio veneciano, un mortero golpeó el templo. La explosión abrió la cella y derribó buena parte de las dos largas columnatas.',
      ],
      facts: [
        { label: 'Fecha', value: '26 sep 1687' },
        { label: 'Asedio', value: 'Veneciano' },
        { label: 'Mando', value: 'F. Morosini' },
      ],
    },
    {
      id: 'marbles',
      year: '1801',
      name: 'Los mármoles',
      kicker: '05 — 1801–1812',
      title: 'Los mármoles se van',
      paragraphs: [
        'Entre 1801 y 1812, agentes de lord Elgin retiraron cerca de la mitad de la escultura que se conservaba: figuras de los frontones, metopas y buena parte del friso jónico.',
        'Casi todo se envió a Gran Bretaña y hoy está en el Museo Británico. Grecia lleva mucho tiempo pidiendo que se lo devuelvan.',
      ],
      facts: [
        { label: 'Años', value: '1801–1812' },
        { label: 'Se llevaron', value: 'Frontones · friso' },
        { label: 'Hoy', value: 'Museo Británico' },
      ],
    },
    {
      id: 'today',
      year: 'Hoy',
      name: 'Restauración',
      kicker: '06 — Hoy',
      title: 'Reconstruir con cuidado',
      paragraphs: [
        'La Acrópolis está en restauración desde 1975. Los bloques caídos se identifican, se reparan con mármol pentélico nuevo y se vuelven a colocar, como en la columnata norte.',
        'El trabajo es parcial por diseño: gran parte del templo no se reconstruirá nunca. En 2009 abrió el Museo de la Acrópolis, al pie de la roca, para mostrar las esculturas que se conservan.',
      ],
      facts: [
        { label: 'Restauración', value: 'Desde 1975' },
        { label: 'Museo', value: '2009' },
        { label: 'Reparaciones', value: 'Mármol nuevo' },
      ],
    },
    {
      id: 'explore',
      year: 'Tú',
      name: 'Explora',
      kicker: '07 — Explora',
      title: 'Ahora, tú',
      paragraphs: ['Toda la historia cabe en una sola maqueta. Gírala, cambia entre sus estados y toca sus partes.'],
      explore: {
        hint: 'Arrastra para girar la maqueta · toca una parte',
        views: [
          { id: 'today', label: 'Hoy' },
          { id: 'built', label: '432 a. C.' },
          { id: 'painted', label: 'Pintado' },
          { id: 'exploded', label: 'Desarmado' },
        ],
        parts: [
          {
            id: 'column',
            name: 'Columna dórica',
            text: 'Cuarenta y seis columnas exteriores de unos 10,4 m de alto, cada una una pila de tambores de mármol acanalados en obra con 20 estrías. Se ensanchan un poco hacia el centro (éntasis) y se inclinan levemente hacia dentro.',
          },
          {
            id: 'frieze',
            name: 'Entablamento y friso',
            text: 'Sobre las columnas, los triglifos se alternan con 92 metopas talladas: dioses contra gigantes, griegos contra amazonas, lapitas contra centauros y la caída de Troya.',
          },
          {
            id: 'pediment',
            name: 'Frontones',
            text: 'El frontón oriental mostraba el nacimiento de Atenea; el occidental, su disputa con Poseidón por el Ática. La mayoría de las figuras que se conservan están en Londres y en el Museo de la Acrópolis.',
          },
          {
            id: 'cella',
            name: 'Cella',
            text: 'La sala interior guardaba la estatua de oro y marfil de Atenea Partenos, obra de Fidias, de unos 12 m de alto. Un cuarto más pequeño detrás de ella custodiaba el tesoro.',
          },
          {
            id: 'crepidoma',
            name: 'Escalones y estilóbato',
            text: 'Tres escalones elevan el templo. El más alto, el estilóbato, sube unos centímetros hacia el centro de cada lado: uno de los refinamientos ópticos del edificio.',
          },
        ],
      },
    },
  ],
  label: {
    name: 'ΠΑΡΘΕΝΩΝ',
    nameLang: 'el',
    caption: 'Partenón · Atenas',
    lines: ['447–432 a. C. · Mármol pentélico', 'Templo dórico a Atenea', 'Escala 1:200 · Inv. Nº 0447', '37,9715° N · 23,7267° E'],
  },
};
