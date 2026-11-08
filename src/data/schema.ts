import { getT, formatPrice } from '../i18n/t';
import { contacto, experiencias, faqIds, links, maridaje, platos } from './nami';
import { fotosPublicas, ogImage } from './imagenes';

const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export interface PageImage {
  loc: string;
  title: string;
  caption: string;
}

function abs(site: URL, path: string) {
  return new URL(path, site).href;
}

export function pageImages(site: URL): PageImage[] {
  const t = getT();
  return fotosPublicas.map((foto) => ({
    loc: abs(site, foto.src),
    title: `${t(`photos.${foto.id}.label`)} · Nami`,
    caption: t(`photos.${foto.id}.alt`),
  }));
}

export function structuredData(site: URL) {
  const t = getT();
  const home = new URL('/', site).href;
  const restaurantId = new URL('/#restaurant', site).href;
  const websiteId = new URL('/#website', site).href;
  const webpageId = new URL('/#webpage', site).href;
  const telephone = links.telefono.replace('tel:', '');
  const shareImage = {
    '@type': 'ImageObject',
    url: abs(site, ogImage.src),
    width: 1200,
    height: 630,
    caption: t('og.imageAlt'),
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Restaurant',
        '@id': restaurantId,
        name: 'Nami',
        alternateName: ['Nami Restaurant', 'Nami Barcelona'],
        slogan: t('seo.slogan'),
        description: t('seo.schemaDescription'),
        url: home,
        image: [
          shareImage,
          ...pageImages(site)
            .slice(0, 4)
            .map((photo) => ({ '@type': 'ImageObject', url: photo.loc, caption: photo.caption })),
        ],
        logo: abs(site, '/icon-512.png'),
        telephone,
        email: contacto.email,
        priceRange: '€€€',
        servesCuisine: [t('seo.cuisineJapanese'), t('seo.cuisineNikkei'), t('seo.cuisineMediterranean')],
        currenciesAccepted: 'EUR',
        acceptsReservations: true,
        menu: links.carta,
        hasMenu: {
          '@type': 'Menu',
          name: t('seo.menuName'),
          url: links.carta,
          hasMenuSection: [
            {
              '@type': 'MenuSection',
              name: t('carta.eyebrow'),
              hasMenuItem: platos.map((id) => {
                const detail = t(`carta.dishes.${id}.detail`);
                return {
                  '@type': 'MenuItem',
                  name: t(`carta.dishes.${id}.name`),
                  ...(detail ? { description: detail } : {}),
                };
              }),
            },
            {
              '@type': 'MenuSection',
              name: t('experiences.eyebrow'),
              hasMenuItem: [
                ...experiencias.map((exp) => ({
                  '@type': 'MenuItem',
                  name: t(`experiences.${exp.id}.name`),
                  description: `${t(`experiences.${exp.id}.description`)} ${t('experiences.perPerson', { price: formatPrice(exp.price / 2) })}.`,
                  offers: { '@type': 'Offer', price: String(exp.price), priceCurrency: 'EUR' },
                })),
                {
                  '@type': 'MenuItem',
                  name: t('experiences.pairing.name'),
                  description: t('experiences.pairing.description'),
                  offers: { '@type': 'Offer', price: String(maridaje.price), priceCurrency: 'EUR' },
                },
              ],
            },
          ],
        },
        address: {
          '@type': 'PostalAddress',
          streetAddress: contacto.calle,
          postalCode: contacto.codigoPostal,
          addressLocality: contacto.localidad,
          addressRegion: 'Cataluña',
          addressCountry: 'ES',
        },
        geo: { '@type': 'GeoCoordinates', latitude: contacto.lat, longitude: contacto.lon },
        hasMap: links.maps,
        openingHoursSpecification: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: WEEK,
          opens: '13:00',
          closes: '00:00',
        },
        contactPoint: { '@type': 'ContactPoint', telephone, contactType: 'reservations' },
        sameAs: [links.instagram, 'https://www.namicrestaurant.com/'],
        mainEntityOfPage: { '@id': webpageId },
        potentialAction: {
          '@type': 'ReserveAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: links.reservar,
            inLanguage: 'es',
            actionPlatform: ['https://schema.org/DesktopWebPlatform', 'https://schema.org/MobileWebPlatform'],
          },
          result: { '@type': 'FoodEstablishmentReservation', name: t('seo.reservationName') },
        },
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: home,
        name: 'Nami',
        alternateName: 'Nami Barcelona',
        description: t('seo.description'),
        inLanguage: 'es-ES',
        publisher: { '@id': restaurantId },
      },
      {
        '@type': 'WebPage',
        '@id': webpageId,
        url: home,
        name: t('seo.title'),
        description: t('seo.description'),
        inLanguage: 'es-ES',
        isPartOf: { '@id': websiteId },
        about: { '@id': restaurantId },
        mainEntity: { '@id': restaurantId },
        primaryImageOfPage: shareImage,
      },
      {
        '@type': 'FAQPage',
        '@id': new URL('/#faq', site).href,
        url: new URL('/#preguntas', site).href,
        inLanguage: 'es-ES',
        isPartOf: { '@id': webpageId },
        mainEntity: faqIds.map((id) => ({
          '@type': 'Question',
          name: t(`faq.items.${id}.q`),
          acceptedAnswer: { '@type': 'Answer', text: t(`faq.items.${id}.a`) },
        })),
      },
    ],
  };
}
