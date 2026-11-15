// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { publicPhotos, ogImage } from './src/shared/site/imagenes.ts';
import { getT, locales, defaultLocale } from './src/shared/i18n/t.ts';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({ imageService: { build: 'compile' }, prerenderEnvironment: 'node' }),
  site: import.meta.env.DEV
    ? 'http://localhost:4321/'
    : 'https://nami-sushi.nami-sushi.workers.dev/',

  i18n: {
    defaultLocale,
    locales: [...locales],
    fallback: { es: defaultLocale, it: defaultLocale },
    routing: { prefixDefaultLocale: false, fallbackType: 'rewrite' },
  },

  redirects: {
    '/reservar': '/reserve/',
    '/es/reservar': '/es/reserve/',
    '/it/reservar': '/it/reserve/',
  },

  // La portada lleva sus imágenes en el sitemap: la de redes y las fotos del local.
  integrations: [
    sitemap({
      i18n: {
        defaultLocale,
        locales: Object.fromEntries(locales.map((locale) => [locale, locale])),
      },
      // La portada lleva sus imágenes en el sitemap: la de redes y las fotos del local.
      serialize(item) {
        if (new URL(item.url).pathname !== '/') return item;
        const t = getT();
        const images = [
          { src: ogImage.src, title: t('og.title'), caption: t('og.imageAlt') },
          ...publicPhotos.map((foto) => ({
            src: foto.src,
            title: `${t(`photos.${foto.id}.label`)} · Nami`,
            caption: t(`photos.${foto.id}.alt`),
          })),
        ];
        return { ...item, img: images.map(({ src, ...rest }) => ({ url: new URL(src, item.url).href, ...rest })) };
      },
    }),
  ],
  // Fuentes servidas desde el propio dominio, recortadas a latin con pyftsubset
  // (las originales son japonesas y pesan varios MB). Licencias OFL junto a los archivos.
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Hina Mincho',
      cssVariable: '--font-hina',
      fallbacks: ['serif'],
      options: {
        variants: [{ src: ['./src/assets/fonts/hina-mincho-latin-400.woff2'], weight: 400, style: 'normal' }],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Zen Kaku Gothic New',
      cssVariable: '--font-zen',
      fallbacks: ['sans-serif'],
      options: {
        variants: [
          { src: ['./src/assets/fonts/zen-kaku-gothic-new-latin-400.woff2'], weight: 400, style: 'normal' },
          { src: ['./src/assets/fonts/zen-kaku-gothic-new-latin-500.woff2'], weight: 500, style: 'normal' },
        ],
      },
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
