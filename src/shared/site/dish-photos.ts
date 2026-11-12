import type { ImageMetadata } from 'astro';

type OrderedPhoto = { photo: ImageMetadata; n: number };

const modules = import.meta.glob('../../assets/photos/*.avif', { eager: true }) as Record<string, { default: ImageMetadata }>;

const byDish: Record<string, OrderedPhoto[]> = {};

for (const [path, module] of Object.entries(modules)) {
  const photo = module.default;
  if (!photo) continue;
  const name = path.split('/').pop() ?? '';
  const match = name.match(/^([a-z0-9-]+)-(\d{2})\.avif$/);
  if (!match) continue;
  (byDish[match[1]] ??= []).push({ photo, n: Number(match[2]) });
}

const photosByDish: Record<string, ImageMetadata[]> = {};
for (const [slug, photos] of Object.entries(byDish)) {
  photosByDish[slug] = photos.sort((a, b) => a.n - b.n).map((f) => f.photo);
}

export function dishPhotos(slug: string): ImageMetadata[] {
  return photosByDish[slug] ?? [];
}

const slugsByName: Record<string, string> = {
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

export function photosForMenuItem(title: string): ImageMetadata[] {
  const slug = slugsByName[title];
  return slug ? dishPhotos(slug) : [];
}
