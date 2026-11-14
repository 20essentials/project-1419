// Anything not yet verified is marked as `pending` and only shows in development.

import type { ImageMetadata } from 'astro';
import entrance from '../../assets/photos/0-entrada.webp';
import sideEntrance from '../../assets/photos/1-lateral-entrada.webp';
import specialTable from '../../assets/photos/2-mesa-especial.webp';
import tables from '../../assets/photos/3-mesas.webp';
import bar from '../../assets/photos/4-barra.webp';
import sideBar from '../../assets/photos/5-barra-lateral.webp';
import wine from '../../assets/photos/6-vinos.webp';
import tour1 from '../../assets/paseo/paseo-1.webp';
import tour2 from '../../assets/paseo/paseo-2.webp';
import tour3 from '../../assets/paseo/paseo-3.webp';
import tour4 from '../../assets/paseo/paseo-4.webp';
import tour5 from '../../assets/paseo/paseo-5.webp';
import tour6 from '../../assets/paseo/paseo-6.webp';
import bluefinCarpaccio1 from '../../assets/photos/bluefin-carpaccio-01.avif';
import bluefinCarpaccio2 from '../../assets/photos/bluefin-carpaccio-02.avif';
import bluefinCarpaccio3 from '../../assets/photos/bluefin-carpaccio-03.avif';
import oysterPonzu1 from '../../assets/photos/oyster-ponzu-01.avif';
import oysterPonzu2 from '../../assets/photos/oyster-ponzu-02.avif';
import oysterPonzu3 from '../../assets/photos/oyster-ponzu-03.avif';
import nigiriSelection1 from '../../assets/photos/nigiri-selection-01.avif';
import nigiriSelection2 from '../../assets/photos/nigiri-selection-02.avif';
import nigiriSelection3 from '../../assets/photos/nigiri-selection-03.avif';
import wagyuPicanha1 from '../../assets/photos/wagyu-picanha-01.avif';
import wagyuPicanha2 from '../../assets/photos/wagyu-picanha-02.avif';
import wagyuPicanha3 from '../../assets/photos/wagyu-picanha-03.avif';
import lucumaGelato1 from '../../assets/photos/lucuma-gelato-01.avif';
import lucumaGelato2 from '../../assets/photos/lucuma-gelato-02.avif';
import lucumaGelato3 from '../../assets/photos/lucuma-gelato-03.avif';

export const photos = { entrance, sideEntrance, specialTable, tables, bar, sideBar, wine };

// ffmpeg -i clip.mp4 -an -vf "scale=1920:-2" -c:v libx264 -preset slow -crf 28 -g 6 -keyint_min 6 -sc_threshold 0 -pix_fmt yuv420p -color_primaries bt709 -color_trc iec61966-2-1 -colorspace bt709 -color_range tv -movflags +faststart+write_colr public/video/paseo-1.mp4
export type Stop = {
  id: string;
  clip: string;
  focus: number;
  poster: ImageMetadata;
};

export const tour: { stops: Stop[] } = {
  stops: [
    { id: 'intro', clip: '/video/paseo-1.mp4', focus: 50, poster: tour1 },
    { id: 'nikkei', clip: '/video/paseo-2.mp4', focus: 50, poster: tour2 },
    { id: 'pricing', clip: '/video/paseo-3.mp4', focus: 50, poster: tour3 },
    { id: 'produce', clip: '/video/paseo-4.mp4', focus: 50, poster: tour4 },
    { id: 'shari', clip: '/video/paseo-5.mp4', focus: 50, poster: tour5 },
    { id: 'how-it-works', clip: '/video/paseo-6.mp4', focus: 50, poster: tour6 },
  ],
};

export const links = {
  reserve: '/reserve/',
  gift: '/gift/',
  menu: '/menu/',
  maps: 'https://maps.google.com/?q=Passeig+de+Gracia+24+08008+Barcelona',
  instagram: 'https://www.instagram.com/nami.barcelona/',
  phone: 'tel:+34931270815',
  email: 'mailto:hola@namicrestaurant.com',
};

export const contact = {
  street: 'Passeig de Gràcia 24',
  city: '08008 Barcelona',
  postalCode: '08008',
  locality: 'Barcelona',
  neighborhood: 'Eixample',
  lat: 41.3922385,
  lon: 2.1636479,
  phone: '+34 931 27 08 15',
  email: 'hola@namicrestaurant.com',
  instagram: '@nami.barcelona',
};

export type NavItem = { id: string; href: string };

export const nav: NavItem[] = [
  { id: 'tour', href: '#nikkei' },
  { id: 'menu', href: '#menu' },
  { id: 'experiences', href: '#experiences' },
  { id: 'questions', href: '#questions' },
];

export type LegalPage = { id: string; href: string };

export const legal: LegalPage[] = [
  { id: 'legal-notices', href: '/legal/' },
  { id: 'privacy', href: '/privacy/' },
  { id: 'cookies', href: '/cookies/' },
  { id: 'purchase-terms', href: '/purchase-terms/' },
];

export type Experience = { id: 'short' | 'full'; price: number; popular?: boolean };

export const experiences: Experience[] = [
  { id: 'short', price: 150 },
  { id: 'full', price: 250, popular: true },
];

export const pairing = { price: 100 };

export const dishes = [
  {
    id: 'bluefin-carpaccio',
    photos: [
      bluefinCarpaccio1,
      bluefinCarpaccio2,
      bluefinCarpaccio3,
    ],
  },
  {
    id: 'oyster-ponzu',
    photos: [oysterPonzu1, oysterPonzu2, oysterPonzu3],
  },
  {
    id: 'nigiri-selection',
    photos: [nigiriSelection1, nigiriSelection2, nigiriSelection3],
  },
  {
    id: 'wagyu-picanha',
    photos: [wagyuPicanha1, wagyuPicanha2, wagyuPicanha3],
  },
  {
    id: 'lucuma-gelato',
    photos: [lucumaGelato1, lucumaGelato2, lucumaGelato3],
  },
] as const;

export const press = { outlet: 'El Periódico', url: '#' };

export const googleReviews = {
  rating: 4.8,
  count: 320,
  url: links.maps,
};

export const faqIds = [
  'what-is-nami',
  'what-is-nikkei',
  'cost',
  'experiences',
  'cancel',
  'raw-fish-safety',
  'gluten-free',
  'opening-hours',
  'location',
  'groups-events',
  'gift-voucher',
] as const;

export const pendingFaqs = [] as const;
