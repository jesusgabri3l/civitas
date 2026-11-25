import type { MonumentStory } from '../types';

/**
 * San Francisco: la historia del puente Golden Gate en español (misma forma que `story.ts`; los datos son los de la versión en inglés).
 * Español neutro con tú, sin hablar de la técnica.
 */
export const story: MonumentStory = {
  city: 'San Francisco',
  cityLocal: 'San Francisco',
  cityLocalLang: 'en',
  motif: 'catenary',
  hero: {
    id: 'prologue',
    year: 'Prólogo',
    name: 'La maqueta',
    kicker: 'SAN FRANCISCO · 1933–1937',
    title: 'Golden Gate Bridge',
    titleLang: 'en',
    subtitle: 'Un puente sobre el estrecho del Golden Gate',
    paragraphs: ['La Marina lo quería a rayas negras y amarillas. El color le llegó de la imprimación. Míralo levantarse del estrecho, cable por cable.'],
    cta: 'Empezar',
  },
  chapters: [
    {
      id: 'towers',
      year: '1933',
      name: 'Las torres',
      kicker: '02 — Las torres',
      title: 'Dos torres en el estrecho',
      paragraphs: [
        'La obra empezó el 5 de enero de 1933. La torre de Marin se levantó desde noviembre de 1933; la de San Francisco se alza sobre un pilar dentro de un muro de defensa terminado en octubre de 1934, y se completó el 28 de junio de 1935.',
        'Cada torre mide 227 m sobre el agua.',
      ],
      facts: [
        { label: 'Inicio de la obra', value: '5 ene 1933' },
        { label: 'Altura', value: '227 m' },
        { label: 'Segunda torre', value: '28 jun 1935' },
      ],
    },
    {
      id: 'cables',
      year: '1935',
      name: 'Los cables',
      kicker: '03 — Los cables',
      title: '27.572 alambres, hilados en el sitio',
      paragraphs: [
        'Los cables se hilaron en el sitio, de octubre de 1935 a mayo de 1936. Cada uno tiene 61 cordones de unos 452 alambres: 27.572 alambres, y 129.000 km de alambre entre los dos.',
        'Después colgaron las péndolas: 250 pares, una cada 15 m.',
      ],
      facts: [
        { label: 'Alambres por cable', value: '27.572' },
        { label: 'Alambre en total', value: '129.000 km' },
        { label: 'Hilado', value: 'oct 1935 – may 1936' },
      ],
    },
    {
      id: 'deck',
      year: '1936',
      name: 'El tablero',
      kicker: '04 — El tablero',
      title: 'Encontrarse en el medio',
      paragraphs: ['La estructura colgada se montó de julio a diciembre de 1936. Las dos mitades del vano central se unieron en el medio el 18 de noviembre de 1936.'],
      facts: [
        { label: 'Mitades unidas', value: '18 nov 1936' },
        { label: 'Vano central', value: '1.280 m' },
        { label: 'Ancho del puente', value: '27 m' },
      ],
    },
    {
      id: 'net',
      year: '1937',
      name: 'La red',
      kicker: '05 — La red',
      title: 'A mitad de camino al infierno',
      paragraphs: [
        'Una red de cuerda de manila colgaba bajo el tablero, de torre a torre. Salvó a 19 hombres, que se hicieron llamar el Halfway-to-Hell Club.',
        'Aun así murieron 11: Kermit Moore el 21 de octubre de 1936 y otros diez el 17 de febrero de 1937, cuando un andamio cayó a través de la red. El puente se abrió a los peatones el 27 de mayo de 1937 y a los vehículos al día siguiente, con Roosevelt dando la señal por telégrafo.',
      ],
      facts: [
        { label: 'Salvados por la red', value: '19 hombres' },
        { label: 'Muertos', value: '11' },
        { label: 'Apertura', value: '27–28 may 1937' },
      ],
    },
    {
      id: 'color',
      year: 'Hoy',
      name: 'El color',
      kicker: '06 — Hoy',
      title: 'El color que nadie planeó',
      paragraphs: [
        'La Marina pidió rayas negras y amarillas; otros sugirieron aluminio o gris. El acero había llegado con una imprimación de minio, y el arquitecto Irving Morrow pidió conservar ese color: sostuvo que combinaba con las colinas y contrastaba con el océano y el cielo.',
        'Hoy es International Orange, un tono que ya existía en la industria aeroespacial para destacar objetos de lo que los rodea. Nunca fue dorado.',
      ],
      facts: [
        { label: 'La Marina quería', value: 'Negro y amarillo' },
        { label: 'Imprimación', value: 'Minio' },
        { label: 'Lo eligió', value: 'Irving Morrow' },
      ],
    },
    {
      id: 'explore',
      year: 'Tú',
      name: 'Explora',
      kicker: '07 — Explora',
      title: 'Ahora, tú',
      paragraphs: ['Toda la historia cabe en una maqueta. Gírala, cambia entre sus estados y toca sus partes.'],
      explore: {
        hint: 'Arrastra para girar la maqueta · toca una parte',
        views: [
          { id: 'today', label: 'Hoy' },
          { id: 'stripes', label: 'Las rayas de la Marina' },
          { id: '1936', label: '1936' },
        ],
        parts: [
          {
            id: 'tower',
            name: 'Las torres',
            text: '227 m sobre el agua. Irving Morrow les dio nervaduras verticales y un aire Art Déco.',
          },
          {
            id: 'cable',
            name: 'Los cables principales',
            text: 'Cada uno mide 0,92 m de grosor: 27.572 alambres, hilados en el sitio.',
          },
          {
            id: 'hangers',
            name: 'Las péndolas',
            text: '250 pares de cuerdas, una cada 15 m, cuelgan el tablero de los cables.',
          },
          {
            id: 'deck',
            name: 'El tablero',
            text: 'El puente mide 27 m de ancho, 19 m de ellos de calzada entre los bordillos. El tablero original se cambió entero y el nuevo se terminó el 15 de agosto de 1985.',
          },
          {
            id: 'pier',
            name: 'El pilar sur',
            text: 'Sobre él se alza la torre de San Francisco, dentro de un muro de defensa terminado el 24 de octubre de 1934.',
          },
          {
            id: 'anchorage',
            name: 'Los anclajes',
            text: 'Unas 54.400 toneladas cada uno. Los cables terminan en ellos.',
          },
          {
            id: 'arch',
            name: 'Arco de Fort Point',
            text: 'Un arco de acero de 97 m sostiene la calzada sobre Fort Point, el fuerte histórico, que así se salvó. Su obra empezó el 21 de julio de 1936.',
          },
        ],
      },
    },
  ],
  label: {
    name: 'Golden Gate Bridge',
    nameLang: 'en',
    caption: 'Al otro lado del Golden Gate · San Francisco',
    lines: ['1933–1937 · Acero, International Orange', '2.737 m de largo', 'Escala 1:2000 · Inv. Nº 1937', '37,8199° N · 122,4783° O'],
  },
};
