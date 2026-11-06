import type { MonumentStory } from '../types';

/**
 * Roma: la historia del Coliseo en español (misma forma que `story.ts`; los datos son los de la versión en inglés).
 * Español neutro con tú, sin hablar de la técnica.
 */
export const story: MonumentStory = {
  city: 'Roma',
  cityLocal: 'Roma',
  cityLocalLang: 'it',
  motif: 'double-rule',
  hero: {
    id: 'prologue',
    year: 'Prólogo',
    name: 'La maqueta',
    kicker: 'Piazza del Colosseo, Roma · 72–80 d. C.',
    title: 'COLOSSEVM',
    titleLang: 'la',
    subtitle: 'El Coliseo',
    paragraphs: ['El gran anfiteatro de Roma, visto en un amanecer frío tal como se levanta hoy. Desármalo, álzalo de nuevo y mira cómo cae su anillo exterior.'],
    cta: 'Entra a la arena',
  },
  chapters: [
    {
      id: 'tibur',
      year: 'Tibur',
      name: 'La cantera',
      kicker: 'II · Tibur',
      title: 'Piedra de Tibur',
      paragraphs: [
        'El Coliseo está hecho sobre todo de travertino, una caliza clara extraída en Tibur, la actual Tívoli, a unos 30 km de Roma. Los bloques se llevaron por un camino hecho para la obra y se unieron con grapas de hierro en lugar de mortero.',
        'La toba, el ladrillo y el concreto hicieron el resto. Aquí el anfiteatro está desarmado en sus capas: las arcadas, los anillos de asientos y la arena.',
      ],
      facts: [
        { label: 'Cantera', value: 'Tibur (Tívoli)' },
        { label: 'Distancia', value: '~30 km' },
        { label: 'Piedra', value: 'Travertino' },
      ],
    },
    {
      id: 'vespasian',
      year: '72 d. C.',
      name: 'Vespasiano',
      kicker: 'III · 72 d. C.',
      title: 'Construido en ocho años',
      paragraphs: [
        'Hacia el año 72 d. C. el emperador Vespasiano empezó el anfiteatro donde había estado el lago artificial de Nerón: un lugar para los juegos públicos en un terreno que Nerón había tomado para su palacio, probablemente pagado con el botín de la guerra de Judea. Su hijo Tito lo inauguró en el 80 d. C. y Domiciano lo terminó.',
        'Se alza en cuatro niveles: tres arcadas de ochenta arcos cada una, bajo un ático macizo. Las semicolumnas cambian de nivel en nivel: toscanas, jónicas y corintias.',
      ],
      facts: [
        { label: 'Inicio', value: 'h. 72 d. C.' },
        { label: 'Inauguración', value: '80 d. C.' },
        { label: 'Arcos', value: '80 por nivel' },
      ],
    },
    {
      id: 'games',
      year: '80 d. C.',
      name: 'Los juegos',
      kicker: 'IV · 80 d. C.',
      title: 'Cien días de juegos',
      paragraphs: [
        'Tito lo inauguró con unos juegos que, según el historiador Dion Casio, duraron cien días. Unos cincuenta mil espectadores se sentaban por rango, con el emperador y los senadores lo más cerca de la arena.',
        'Sobre sus cabezas, los marineros manejaban un gran toldo, el velarium, para dar sombra a los asientos. Aquí se despliega desde los mástiles del ático.',
      ],
      facts: [
        { label: 'Juegos', value: '100 días' },
        { label: 'Asientos', value: '~50 000' },
        { label: 'Toldo', value: 'Velarium' },
      ],
    },
    {
      id: 'earthquake',
      year: '1349',
      name: 'El terremoto',
      kicker: 'V · 1349',
      title: 'El terremoto',
      paragraphs: [
        'Mucho después de los últimos juegos, el Coliseo fue fortaleza, vivienda y cantera. En 1349 un terremoto derribó el anillo exterior del lado sur, y su piedra se llevó para construir iglesias y palacios.',
        'Lo que cayó está marcado aquí en color. Detrás del muro que falta aparece el segundo anillo, el que todavía sostiene los asientos.',
      ],
      facts: [
        { label: 'Terremoto', value: '1349' },
        { label: 'Cayó', value: 'Anillo exterior sur' },
        { label: 'Piedra', value: 'Reutilizada en Roma' },
      ],
    },
    {
      id: 'today',
      year: 'Hoy',
      name: 'Sostenerlo en pie',
      kicker: 'VI · Hoy',
      title: 'Sostenerlo en pie',
      paragraphs: [
        'El lado norte sigue en pie en toda su altura; el sur deja ver el anillo interior por la brecha. Para que el muro roto no siguiera cediendo, se levantaron contrafuertes de ladrillo contra sus extremos en 1807 y 1827. Aquí están marcados en color.',
        'La fachada se limpió y se restauró en un proyecto que terminó en 2016. La arena, abierta al hipogeo, muestra el laberinto que antes quedaba oculto bajo el suelo de arena.',
      ],
      facts: [
        { label: 'Contrafuertes', value: '1807 · 1827' },
        { label: 'Restauración', value: '2013–2016' },
        { label: 'Aún en pie', value: 'Lado norte' },
      ],
    },
    {
      id: 'explore',
      year: 'Tú',
      name: 'Explora',
      kicker: 'VII · Explora',
      title: 'Ahora, tú',
      paragraphs: ['Toda la historia cabe en una sola maqueta. Gírala, cambia entre sus estados y toca sus partes.'],
      explore: {
        hint: 'Arrastra para girar la maqueta · toca una parte',
        views: [
          { id: 'today', label: 'Hoy' },
          { id: 'built', label: '80 d. C.' },
          { id: 'exploded', label: 'Desarmado' },
        ],
        parts: [
          {
            id: 'arcades',
            name: 'Las arcadas',
            text: 'Ochenta arcos en cada uno de los tres niveles, con semicolumnas entre ellos: toscanas abajo, jónicas en medio y corintias arriba. Las entradas numeradas permitían que la multitud llegara a sus asientos y saliera en minutos.',
          },
          {
            id: 'attic',
            name: 'El ático y el toldo',
            text: 'El ático macizo corona la fachada. Sus ménsulas sostenían los mástiles del velarium, el toldo que daba sombra a los asientos y que manejaban marineros de la flota imperial.',
          },
          {
            id: 'cavea',
            name: 'Los asientos',
            text: 'La gradería estaba dividida por rango: el emperador y los senadores lo más cerca de la arena, luego los caballeros, después los ciudadanos y, arriba del todo, los más pobres.',
          },
          {
            id: 'arena',
            name: 'La arena y el hipogeo',
            text: 'La arena era un suelo de madera cubierto de arena, que es lo que significa harena en latín. Debajo corría el hipogeo, un laberinto de pasadizos y montacargas donde esperaban animales, gladiadores y decorados.',
          },
          {
            id: 'buttress',
            name: 'Los contrafuertes',
            text: 'Después de los terremotos, el muro sur quedó roto. En 1807 y 1827 se levantaron contrafuertes de ladrillo contra los extremos de la brecha para que el resto no cayera. Son el rojo que ves sobre la ruina.',
          },
        ],
      },
    },
  ],
  label: {
    name: 'COLOSSEVM',
    nameLang: 'la',
    caption: 'Amphitheatrum Flavium · Roma',
    lines: ['72–80 d. C. · Travertino, toba, ladrillo', 'Elíptico, 189 × 156 m', 'Escala 1:250 · Inv. Nº 0080', '41,8902° N · 12,4922° E'],
  },
};
