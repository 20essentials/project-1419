// Todo lo que no se ha podido verificar va marcado como `pending` y solo se ve en desarrollo.

import type { ImageMetadata } from 'astro';
import entrada from '../assets/photos/0-entrada.webp';
import lateralEntrada from '../assets/photos/1-lateral-entrada.webp';
import mesaEspecial from '../assets/photos/2-mesa-especial.webp';
import mesas from '../assets/photos/3-mesas.webp';
import barra from '../assets/photos/4-barra.webp';
import barraLateral from '../assets/photos/5-barra-lateral.webp';
import vinos from '../assets/photos/6-vinos.webp';
import poster1 from '../assets/paseo/paseo-1.webp';
import poster2 from '../assets/paseo/paseo-2.webp';
import poster3 from '../assets/paseo/paseo-3.webp';
import poster4 from '../assets/paseo/paseo-4.webp';
import poster5 from '../assets/paseo/paseo-5.webp';
import poster6 from '../assets/paseo/paseo-6.webp';

export const photos = { entrada, lateralEntrada, mesaEspecial, mesas, barra, barraLateral, vinos };

// ffmpeg -i clip.mp4 -an -vf "scale=1920:-2" -c:v libx264 -preset slow -crf 28 -g 6 -keyint_min 6 -sc_threshold 0 -pix_fmt yuv420p -color_primaries bt709 -color_trc iec61966-2-1 -colorspace bt709 -color_range tv -movflags +faststart+write_colr public/video/paseo-1.mp4
export type Parada = {
  id: string;
  clip: string;
  focus: number;
  poster: ImageMetadata;
};

export const paseo: { paradas: Parada[] } = {
  paradas: [
    { id: 'inicio', clip: '/video/paseo-1.mp4', focus: 50, poster: poster1 },
    { id: 'nikkei', clip: '/video/paseo-2.mp4', focus: 50, poster: poster2 },
    { id: 'precio', clip: '/video/paseo-3.mp4', focus: 50, poster: poster3 },
    { id: 'producto', clip: '/video/paseo-4.mp4', focus: 50, poster: poster4 },
    { id: 'shari', clip: '/video/paseo-5.mp4', focus: 50, poster: poster5 },
    { id: 'como-reservar', clip: '/video/paseo-6.mp4', focus: 50, poster: poster6 },
  ],
};

export const links = {
  reservar: '/reservar/',
  regalar: '/regalar/',
  carta: '/carta/',
  maps: 'https://maps.google.com/?q=Passeig+de+Gracia+24+08008+Barcelona',
  instagram: 'https://www.instagram.com/nami.barcelona/',
  telefono: 'tel:+34931270815',
  email: 'mailto:hola@namicrestaurant.com',
};

export const contacto = {
  calle: 'Passeig de Gràcia 24',
  ciudad: '08008 Barcelona',
  codigoPostal: '08008',
  localidad: 'Barcelona',
  barrio: 'Eixample',
  lat: 41.3922385,
  lon: 2.1636479,
  telefono: '+34 931 27 08 15',
  email: 'hola@namicrestaurant.com',
  instagram: '@nami.barcelona',
};

export type NavItem = { id: string; href: string };

export const nav: NavItem[] = [
  { id: 'recorrido', href: '#nikkei' },
  { id: 'carta', href: '#carta' },
  { id: 'experiencias', href: '#experiencias' },
  { id: 'preguntas', href: '#preguntas' },
];

export type LegalPage = { id: string; href: string };

export const legal: LegalPage[] = [
  { id: 'legal-notices', href: '/legal/' },
  { id: 'privacy', href: '/privacidad/' },
  { id: 'cookies', href: '/cookies/' },
  { id: 'purchase-terms', href: '/terminos-compra/' },
];

export type Experience = { id: 'short' | 'full'; price: number; popular?: boolean };

export const experiencias: Experience[] = [
  { id: 'short', price: 150 },
  { id: 'full', price: 250, popular: true },
];

export const maridaje = { price: 100 };

export const platos = [
  'bluefin-carpaccio',
  'oyster-ponzu',
  'nigiri-selection',
  'wagyu-picanha',
  'lucuma-gelato',
] as const;

export const prensa = { medio: 'El Periódico', url: '#' };

export const faqIds = [
  'what-is-nami',
  'what-is-nikkei',
  'cost',
  'raw-fish-safety',
  'gluten-free',
  'opening-hours',
  'location',
  'groups-events',
  'gift-voucher',
] as const;

export const pendingFaqs = ['faqCancel', 'faqExperiences'] as const;
