import type { MonumentStory } from '../types';

/**
 * Nueva York: la historia de la Estatua de la Libertad en español (misma forma que `story.ts`; los datos son los de la versión en inglés).
 * Español neutro con tú, sin hablar de la técnica.
 */
export const story: MonumentStory = {
  city: 'Nueva York',
  cityLocal: 'New York',
  cityLocalLang: 'en',
  motif: 'crown-rays',
  hero: {
    id: 'prologue',
    year: 'Prólogo',
    name: 'La maqueta',
    kicker: 'Isla de la Libertad, Nueva York · 1875–1886',
    title: 'Liberty Enlightening the World',
    titleLang: 'en',
    subtitle: 'La Estatua de la Libertad',
    paragraphs: ['Un regalo de Francia, levantado en cobre sobre el puerto de Nueva York. Abre su piel, encuentra el esqueleto que lleva dentro y mírala pasar del marrón de un centavo nuevo al verde.'],
    cta: 'Conoce a Liberty',
  },
  chapters: [
    {
      id: 'skeleton',
      year: '1880–81',
      name: 'El esqueleto de Eiffel',
      kicker: '02 — El esqueleto',
      title: 'Una piel sobre un esqueleto',
      paragraphs: [
        'Frédéric Auguste Bartholdi la esculpió, pero una piel no se sostiene sola. En 1879 contrataron a Gustave Eiffel para diseñar lo que la mantiene en pie, y en 1881 se puso el primer remache.',
        'Un pilón de hierro carga el peso, y una armadura flexible va de él hasta la piel. La piel es de cobre de apenas 2,37 mm, martillada a mano en unas 300 láminas; cuelga del esqueleto en lugar de sostenerse por sí misma.',
      ],
      facts: [
        { label: 'Ingeniero', value: 'Gustave Eiffel' },
        { label: 'Piel', value: '2,37 mm' },
        { label: 'Láminas', value: '~300' },
      ],
    },
    {
      id: 'paris',
      year: '1884',
      name: 'París',
      kicker: '03 — París',
      title: 'Primero se construyó en París',
      paragraphs: [
        'Antes de cruzar el océano se construyó entera en París. Su mano con la antorcha se había mostrado en Filadelfia en 1876 y su cabeza en París en 1878.',
        'El 4 de julio de 1884 se presentó allí, terminada y todavía de un cobre brillante, sin pedestal debajo.',
      ],
      facts: [
        { label: 'Mano con la antorcha', value: 'Filadelfia, 1876' },
        { label: 'Cabeza', value: 'París, 1878' },
        { label: 'Presentada', value: '4 jul 1884' },
      ],
    },
    {
      id: 'crates',
      year: '1885',
      name: '350 piezas',
      kicker: '04 — La travesía',
      title: 'Enviada en 214 cajas',
      paragraphs: [
        'Para cruzar el Atlántico la desarmaron en 350 piezas y las empacaron en 214 cajas. La fragata francesa Isère las llevó al puerto de Nueva York el 17 de junio de 1885.',
        'El pedestal no estaba listo. La campaña de donaciones de Joseph Pulitzer en 1885 rescató la obra, y el pedestal de Richard Morris Hunt se levantó sobre Fort Wood, el fuerte en forma de estrella de 1811.',
      ],
      facts: [
        { label: 'Piezas', value: '350' },
        { label: 'Cajas', value: '214' },
        { label: 'Llegada', value: '17 jun 1885' },
      ],
    },
    {
      id: 'dedication',
      year: '1886',
      name: 'Inauguración',
      kicker: '05 — Inauguración',
      title: 'Un faro para el puerto',
      paragraphs: [
        'La armaron de nuevo sobre su pedestal y se inauguró el 28 de octubre de 1886. Su antorcha se encendió como una luz real para los barcos, y fue faro oficial hasta 1902.',
        'Todavía no era verde: en 1886 era marrón, como un centavo nuevo.',
      ],
      facts: [
        { label: 'Inaugurada', value: '28 oct 1886' },
        { label: 'Faro', value: 'Hasta 1902' },
        { label: 'Hasta la antorcha', value: '93 m' },
      ],
    },
    {
      id: 'patina',
      year: 'Hoy',
      name: 'La pátina',
      kicker: '06 — Hoy',
      title: 'Por qué se volvió verde',
      paragraphs: [
        'El cobre reacciona con el aire, la lluvia y la sal del mar, y poco a poco forma una capa verde muy fina. En la Libertad tardó unos treinta años.',
        'Esa capa no es un daño: protege el metal que hay debajo. La antorcha que ves hoy es una réplica cubierta con pan de oro, de 1986; la original está en el museo de la isla desde 2019.',
      ],
      facts: [
        { label: 'Piel', value: '2,37 mm' },
        { label: 'El cambio', value: '~30 años' },
        { label: 'Antorcha', value: 'Pan de oro, 1986' },
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
        credit: { text: 'Modelo de la estatua: gravityjack (Sketchfab), CC BY 4.0', href: 'https://sketchfab.com/3d-models/84094e8d5e724b5c882cf576ca12e44e' },
        hint: 'Arrastra para girar la maqueta · toca una parte',
        views: [
          { id: 'today', label: 'Hoy' },
          { id: '1886', label: '1886' },
          { id: 'skeleton', label: 'Esqueleto' },
        ],
        parts: [
          {
            id: 'torch',
            name: 'La antorcha',
            text: 'La llama de hoy es una réplica cubierta con pan de oro, hecha en 1986. La original está en el museo de la isla desde 2019.',
          },
          {
            id: 'crown',
            name: 'La corona',
            text: 'Siete rayos y 25 ventanas coronan su cabeza.',
          },
          {
            id: 'tablet',
            name: 'La tablilla',
            text: 'Sostiene una tablilla con la inscripción JULY IV MDCCLXXVI: la fecha de la Declaración de Independencia, el 4 de julio de 1776.',
          },
          {
            id: 'skin',
            name: 'La piel',
            text: 'Láminas de cobre de 2,4 mm martilladas a mano sobre un molde, una técnica llamada repujado.',
          },
          {
            id: 'pylon',
            view: 'skeleton',
            name: 'El pilón de Eiffel',
            text: 'Un esqueleto de hierro flexible. La piel cuelga de él y no se sostiene sola.',
          },
          {
            id: 'pedestal',
            name: 'El pedestal',
            text: 'Diseñado por Richard Morris Hunt. La obra se rescató en 1885 con la campaña de donaciones de Joseph Pulitzer.',
          },
          {
            id: 'fort',
            name: 'Fort Wood',
            text: 'El fuerte de 1811, en forma de estrella de 11 puntas, sobre el que se apoya.',
          },
        ],
      },
    },
  ],
  label: {
    name: 'Liberty Enlightening the World',
    nameLang: 'en',
    caption: 'Estatua de la Libertad · Nueva York',
    lines: ['1875–1886 · Cobre sobre armazón de hierro', '93 m hasta la antorcha', 'Escala 1:300 · Inv. Nº 1886', '40,6892° N · 74,0445° O'],
  },
};
