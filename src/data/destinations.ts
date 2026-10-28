export type DestinationId = 'atenas' | 'roma' | 'paris';

export interface PageMeta {
  path: string;
  title: string;
  description: string;
  ogImage: string;
}

export interface Destination extends PageMeta {
  id: DestinationId;
  name: string;
  monument: string;
  intro: string;
}

export const home: PageMeta & { intro: string } = {
  path: '/',
  title: 'WorldHub — monumentos del mundo en 3D',
  description:
    'Gira el globo y entra a Atenas, Roma y París: monumentos en 3D con luz, atmósfera e historia.',
  ogImage: '/og/home.svg',
  intro: 'Un globo, tres monumentos. Elige un destino para entrar.',
};

export const destinations: Destination[] = [
  {
    id: 'atenas',
    path: '/atenas',
    name: 'Atenas',
    monument: 'Partenón',
    title: 'Atenas y el Partenón en 3D — WorldHub',
    description: 'El Partenón en hora dorada: luz, polvo y datos de la Acrópolis de Atenas en 3D.',
    ogImage: '/og/atenas.svg',
    intro: 'Atenas, hora dorada sobre la Acrópolis.',
  },
  {
    id: 'roma',
    path: '/roma',
    name: 'Roma',
    monument: 'Coliseo',
    title: 'Roma y el Coliseo en 3D — WorldHub',
    description: 'El Coliseo al amanecer, con neblina fría y su cuarto nivel, en 3D.',
    ogImage: '/og/roma.svg',
    intro: 'Roma, amanecer frío sobre el Coliseo.',
  },
  {
    id: 'paris',
    path: '/paris',
    name: 'París',
    monument: 'Torre Eiffel',
    title: 'París y la Torre Eiffel en 3D — WorldHub',
    description: 'La Torre Eiffel de noche con luces ámbar y su centelleo, en 3D.',
    ogImage: '/og/paris.svg',
    intro: 'París, noche ámbar con la Torre Eiffel.',
  },
];
