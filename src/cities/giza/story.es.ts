import type { MonumentStory } from '../types';

/**
 * Guiza: la historia de la Gran Pirámide en español (misma forma que `story.ts`; los datos son los de la versión en inglés).
 * Español neutro con tú, sin hablar de la técnica.
 */
export const story: MonumentStory = {
  city: 'Guiza',
  cityLocal: 'Giza',
  cityLocalLang: 'en',
  motif: 'courses',
  hero: {
    id: 'prologue',
    year: 'Prólogo',
    name: 'La maqueta',
    kicker: 'GUIZA · H. 2560 A. C.',
    title: 'Akhet Khufu',
    titleLang: 'egy-Latn',
    subtitle: 'La Gran Pirámide de Guiza',
    paragraphs: ['Fue lisa y blanca: una sola cara pulida de caliza, de la base a la punta. Casi toda esa piel ya no está. Mírala subir hilada por hilada y devuélvesela.'],
    cta: 'Empezar',
  },
  chapters: [
    {
      id: 'plateau',
      year: 'h. 2560 a. C.',
      name: 'La meseta',
      kicker: '02 — La meseta',
      title: 'Un cuadrado apuntado a las estrellas',
      paragraphs: [
        'Se construyó para el faraón Khufu (dinastía IV), hacia 2560 a. C. La base, de 230,3 m de lado, se desvía de los puntos cardinales menos de 4′ de arco (menos de una décima de grado).',
        'Las piedras venían de tres lugares: el núcleo, de canteras en la propia meseta; la caliza blanca fina, de Tura, al otro lado del Nilo; y el granito, de Asuán, a más de 900 km al sur.',
      ],
      facts: [
        { label: 'Base', value: '230,3 m' },
        { label: 'Desvío de los puntos cardinales', value: '< 4′' },
        { label: 'Granito de', value: 'Asuán, 900+ km' },
      ],
    },
    {
      id: 'courses',
      year: 'h. 2560 a. C.',
      name: 'Las hiladas',
      kicker: '03 — Las hiladas',
      title: 'Hilada por hilada',
      paragraphs: [
        'Unos 2,3 millones de bloques (una estimación) y unos 6 millones de toneladas de piedra. Dentro, la Gran Galería (46,7 m de largo y 8,6 m de alto) sube hasta la cámara del rey, forrada en granito (10,5 × 5,2 m) y cubierta con nueve losas que pesan unas 400 t en total.',
        'Encima, cinco cámaras de descarga. En ellas las cuadrillas pintaron sus nombres junto al de Khufu: «La cuadrilla: la corona blanca de Khnum-Khufu es poderosa». Cómo subían los bloques sigue en debate.',
      ],
      facts: [
        { label: 'Bloques', value: '≈ 2,3 millones' },
        { label: 'Piedra', value: '≈ 6 millones de t' },
        { label: 'Gran Galería', value: '46,7 m' },
      ],
    },
    {
      id: 'casing',
      year: 'Fin del reinado',
      name: 'El revestimiento',
      kicker: '04 — El revestimiento',
      title: 'El Horizonte de Khufu',
      paragraphs: [
        'Al final del reinado de Khufu (año 26 o 27), el inspector Merer y unos 40 hombres llevaban en barco la caliza blanca de Tura a Guiza. Su diario, hallado en 2013 en Wadi al-Jarf, es el papiro con texto más antiguo que se conoce y llama a la pirámide Akhet Khufu, «Horizonte de Khufu».',
        'Terminada medía 146,6 m (280 codos reales) y, durante más de 3.700 años, fue lo más alto construido por el ser humano.',
      ],
      facts: [
        { label: 'Altura original', value: '146,6 m' },
        { label: 'Pendiente', value: '51°50′40″' },
        { label: 'Lo más alto durante', value: '> 3.700 años' },
      ],
    },
    {
      id: 'stripped',
      year: '1303',
      name: 'El despojo',
      kicker: '05 — El despojo',
      title: 'La piel se va a El Cairo',
      paragraphs: [
        'La tradición atribuye al califa al-Ma’mun, hacia 832, el túnel que hoy usan los visitantes (muchos historiadores creen que es anterior). El 8 de agosto de 1303 un terremoto soltó gran parte del revestimiento, y después las piedras caídas se llevaron a El Cairo para construir.',
        'Hoy mide 138,5 m: le faltan unos 8 m de la punta.',
      ],
      facts: [
        { label: 'Terremoto', value: '8 ago 1303' },
        { label: 'Altura hoy', value: '138,5 m' },
        { label: 'Faltan', value: '≈ 8 m' },
      ],
    },
    {
      id: 'today',
      year: '2017',
      name: 'El vacío',
      kicker: '06 — El vacío',
      title: 'Lo que vieron los muones',
      paragraphs: [
        'En 2017, el equipo de ScanPyramids encontró con muones (partículas de los rayos cósmicos que atraviesan la piedra) un vacío de al menos 30 m sobre la Gran Galería, con una sección parecida a la de la galería. Su función se desconoce.',
        'En 2023 confirmó un corredor de unos 9 m tras la cara norte y lo vio con una cámara endoscópica.',
      ],
      facts: [
        { label: 'Gran Vacío', value: '≥ 30 m' },
        { label: 'Corredor norte', value: '≈ 9 m' },
        { label: 'Hallado', value: '2017' },
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
          { id: 'cased', label: 'h. 2560 a. C.' },
          { id: 'inside', label: 'Por dentro' },
        ],
        parts: [
          {
            id: 'casing',
            name: 'El revestimiento',
            text: 'Caliza blanca fina de Tura, traída en barco por el Nilo. Quedan unas pocas piedras al pie de la cara norte.',
            view: 'cased',
          },
          {
            id: 'core',
            name: 'El núcleo',
            text: 'Unas 200 hiladas de caliza de la propia meseta. Es lo que se ve hoy.',
            view: 'today',
          },
          {
            id: 'entrance',
            name: 'La entrada',
            text: 'La entrada original, en la cara norte, bajo losas en chevrón. Detrás está el corredor confirmado en 2023.',
            view: 'today',
          },
          {
            id: 'tunnel',
            name: 'El túnel de los ladrones',
            text: 'Por donde entran hoy los visitantes. La tradición lo atribuye a al-Ma’mun, hacia 832.',
            view: 'today',
          },
          {
            id: 'gallery',
            name: 'La Gran Galería',
            text: '46,7 m de largo y 8,6 m de alto, con techo en falsa bóveda.',
            view: 'inside',
          },
          {
            id: 'kings-chamber',
            name: 'La cámara del rey',
            text: 'Forrada en granito de Asuán, con cinco cámaras de descarga encima, donde las cuadrillas pintaron sus nombres.',
            view: 'inside',
          },
          {
            id: 'void',
            name: 'El Gran Vacío',
            text: 'Hallado con muones en 2017: al menos 30 m de largo. Nadie sabe para qué sirve.',
            view: 'inside',
          },
        ],
      },
    },
  ],
  label: {
    name: 'Akhet Khufu',
    nameLang: 'egy-Latn',
    caption: 'La Gran Pirámide de Guiza · Guiza',
    lines: ['h. 2560 a. C. · Caliza y granito, revestimiento de Tura', '146,6 m, hoy 138,5 m', 'Escala 1:1000 · Inv. Nº 0027', '29,9792° N · 31,1342° E'],
  },
};
