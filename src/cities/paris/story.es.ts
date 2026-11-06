import type { MonumentStory } from '../types';

/**
 * París: la historia de la Torre Eiffel en español (misma forma que `story.ts`; los datos son los de la versión en inglés).
 * Español neutro con tú, sin hablar de la técnica.
 */
export const story: MonumentStory = {
  city: 'París',
  cityLocal: 'Paris',
  cityLocalLang: 'fr',
  motif: 'truss',
  hero: {
    id: 'prologue',
    year: 'Prólogo',
    name: 'La maqueta',
    kicker: 'Campo de Marte, París · 1887–1889',
    title: 'La Tour Eiffel',
    titleLang: 'fr',
    subtitle: 'La Torre Eiffel',
    paragraphs: ['Una celosía de hierro forjado levantada para la Exposición Universal de 1889. Desármala, viga por viga; de noche, la torre es su propia luz.'],
    cta: 'Sube a la torre',
  },
  chapters: [
    {
      id: 'sketch',
      year: '1884',
      name: 'El boceto',
      kicker: '02 — El dibujo',
      title: 'Dibujada antes de existir',
      paragraphs: [
        'En 1884 dos ingenieros de la empresa de Gustave Eiffel, Maurice Koechlin y Émile Nouguier, bosquejaron un pilón de celosía de hierro de 300 m de alto. El arquitecto Stephen Sauvestre le dio sus grandes arcos.',
        'Eiffel compró los derechos de la patente y su diseño ganó el concurso para la Exposición Universal de 1889. Se dibujaron una por una unas 18 000 piezas de hierro. Aquí aparece sobre el papel, dibujada desde el suelo hacia arriba.',
      ],
      facts: [
        { label: 'Ingenieros', value: 'Koechlin · Nouguier' },
        { label: 'Arquitecto', value: 'Sauvestre' },
        { label: 'Piezas', value: '18 038' },
      ],
    },
    {
      id: 'construction',
      year: '1887–89',
      name: 'Construcción',
      kicker: '03 — Construcción',
      title: 'Dos años y dos meses',
      paragraphs: [
        'Las obras empezaron el 28 de enero de 1887 y terminaron el 31 de marzo de 1889. Las piezas se fabricaron en los talleres de Eiffel en Levallois-Perret y se remacharon en el lugar, nivel por nivel, desde los cuatro pilares hacia arriba.',
        'Unos 2,5 millones de remaches sujetan unas 7300 toneladas de hierro pudelado. Nivel por nivel, desde el suelo, la torre fue subiendo en su sitio.',
      ],
      facts: [
        { label: 'Inicio', value: '28 ene 1887' },
        { label: 'Fin', value: '31 mar 1889' },
        { label: 'Remaches', value: '~2,5 millones' },
      ],
    },
    {
      id: 'fair',
      year: '1889',
      name: 'Exposición Universal',
      kicker: '04 — 1889',
      title: 'La puerta de la exposición',
      paragraphs: [
        'Se construyó como la entrada de la Exposición Universal de 1889, cien años después de la Revolución francesa. Con sus 300 m era la estructura más alta del mundo y conservó el título hasta 1930.',
        'De noche la iluminaban lámparas de gas a lo largo de sus aristas y un faro en la cima.',
      ],
      facts: [
        { label: 'Inauguración', value: '31 mar 1889' },
        { label: 'Altura', value: '300 m' },
        { label: 'Récord', value: 'Hasta 1930' },
      ],
    },
    {
      id: 'radio',
      year: '1909',
      name: 'Salvada por la radio',
      kicker: '05 — 1909',
      title: 'Hecha para durar veinte años',
      paragraphs: [
        'Iba a ser temporal: el permiso de Eiffel era por veinte años, así que en 1909 la ciudad habría podido derribarla. Para entonces ya tenía un segundo oficio: los experimentos de telegrafía sin hilos desde su cima habían crecido hasta convertirse en una estación de radio.',
        'La antena la hizo demasiado útil para quitarla, y en 1910 el permiso se prorrogó setenta años. Su mástil se ha reemplazado varias veces; el actual, instalado en 2022, deja la torre en 330 m de altura.',
      ],
      facts: [
        { label: 'Permiso', value: '20 años' },
        { label: 'Indulto', value: '1909' },
        { label: 'Altura hoy', value: '330 m' },
      ],
    },
    {
      id: 'today',
      year: 'Hoy',
      name: 'El destello',
      kicker: '06 — Hoy',
      title: 'Cada hora, cinco minutos',
      paragraphs: [
        'Empezó como un espectáculo para el año 2000 y los parisinos no dejaron que terminara. Desde entonces, durante cinco minutos al comenzar cada hora después de oscurecer, unas 20 000 bombillas hacen destellar la torre.',
        'Aquí destella cuando tú quieras, y sola al comenzar cada hora en París. Más o menos cada siete años el hierro se repinta a mano, en tres tonos que se aclaran hacia la cima.',
      ],
      facts: [
        { label: 'Espectáculo', value: '5 min / hora' },
        { label: 'Bombillas', value: '~20 000' },
        { label: 'Repintada', value: '~Cada 7 años' },
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
          { id: 'built', label: '1889' },
          { id: 'sparkle', label: 'Destello' },
          { id: 'exploded', label: 'Desarmada' },
        ],
        parts: [
          {
            id: 'piers',
            name: 'Los cuatro pilares',
            text: 'Cuatro pilares de celosía se levantan en las esquinas de un cuadrado de unos 125 m de lado y se inclinan hacia dentro siguiendo una curva que, según Eiffel, dictó el propio viento. Se unen en el segundo nivel.',
          },
          {
            id: 'arches',
            name: 'Los grandes arcos',
            text: 'Los arcos entre los pilares no cargan nada que valga la pena mencionar: son sobre todo adorno, una firma del arquitecto Sauvestre. Se elevan unos 39 m.',
          },
          {
            id: 'levels',
            name: 'Los tres niveles',
            text: 'Los visitantes llegan a tres niveles: el primero a unos 57 m, el segundo a unos 116 m y el último a unos 276 m. La escalera hasta arriba tiene cerca de 1665 escalones; se pueden subir a pie los 674 que llevan al segundo nivel.',
          },
          {
            id: 'shaft',
            name: 'El fuste',
            text: 'Por encima del segundo nivel, los cuatro pilares se han fundido en un solo fuste que se va estrechando. Termina en la cima, a 300 m, bajo la sala del faro.',
          },
          {
            id: 'mast',
            name: 'La antena',
            text: 'El mástil es lo que cambió después de 1909: primero para la telegrafía sin hilos, luego para la radio y la televisión. La torre pasó de 300 m a 330 m con él.',
          },
        ],
      },
    },
  ],
  label: {
    name: 'La Tour Eiffel',
    nameLang: 'fr',
    caption: 'Torre Eiffel · París',
    lines: ['1887–1889 · Hierro pudelado', 'Torre de celosía de hierro forjado', 'Escala 1:1000 · Inv. Nº 1889', '48,8584° N · 2,2945° E'],
  },
};
