import type { ImageMetadata } from 'astro';

type FotoConOrden = { foto: ImageMetadata; n: number };

const modules = import.meta.glob('../../assets/photos/*.avif', { eager: true }) as Record<string, { default: ImageMetadata }>;

const porPlato: Record<string, FotoConOrden[]> = {};

for (const [ruta, modulo] of Object.entries(modules)) {
  const foto = modulo.default;
  if (!foto) continue;
  const nombre = ruta.split('/').pop() ?? '';
  const match = nombre.match(/^([a-z0-9-]+)-(\d{2})\.avif$/);
  if (!match) continue;
  (porPlato[match[1]] ??= []).push({ foto, n: Number(match[2]) });
}

const fotosPorPlato: Record<string, ImageMetadata[]> = {};
for (const [slug, fotos] of Object.entries(porPlato)) {
  fotosPorPlato[slug] = fotos.sort((a, b) => a.n - b.n).map((f) => f.foto);
}

export function platoFotos(slug: string): ImageMetadata[] {
  return fotosPorPlato[slug] ?? [];
}

const slugsPorNombre: Record<string, string> = {
  'Grilled Wagyu picanha': 'wagyu-picanha',
  'Seabass with kombu butter': 'seabass-kombu-butter',
  'Nikkei roll': 'nikkei-roll',
  'Dragon roll': 'dragon-roll',
  'Uramaki wagyu': 'uramaki-wagyu',
  'Nigiri selection': 'nigiri-selection',
  'Bluefin otoro nigiri': 'bluefin-otoro-nigiri',
  'Salmon belly nigiri': 'salmon-belly-nigiri',
  'Tuna belly sashimi': 'tuna-belly-sashimi',
  'Lucuma gelato': 'lucuma-gelato',
  'Miso chocolate fondant': 'miso-chocolate-fondant',
  'Yuzu cheesecake': 'yuzu-cheesecake',
  'Bluefin tuna belly carpaccio with truffle': 'bluefin-carpaccio',
  'Oyster with passion fruit ponzu': 'oyster-ponzu',
  'Hamachi crudo with yuzu kosho': 'hamachi-crudo',
  'Tuna tataki with aji amarillo': 'tuna-tataki',
};

export function fotosDeCartaItem(title: string): ImageMetadata[] {
  const slug = slugsPorNombre[title];
  return slug ? platoFotos(slug) : [];
}
