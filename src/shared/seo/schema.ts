import { getT, formatPrice, defaultLocale, type Locale } from "@/shared/i18n/t";
import { localizedPathname } from "@/shared/i18n/routing";
import {
  contact,
  experiences,
  faqIds,
  links,
  pairing,
  dishes,
} from "@/shared/site/nami";
import { publicPhotos, ogImage } from "@/shared/site/imagenes";

const WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

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
  return publicPhotos.map((photo) => ({
    loc: abs(site, photo.src),
    title: `${t(`photos.${photo.id}.label`)} · Nami`,
    caption: t(`photos.${photo.id}.alt`),
  }));
}

export function structuredData(site: URL, locale: Locale = defaultLocale) {
  const t = getT(locale);
  const localizedHome = localizedPathname("/", locale);
  const home = new URL(localizedHome, site).href;
  const restaurantId = new URL(`${localizedHome}#restaurant`, site).href;
  const websiteId = new URL(`${localizedHome}#website`, site).href;
  const webpageId = new URL(`${localizedHome}#webpage`, site).href;
  const telephone = links.phone.replace("tel:", "");
  const shareImage = {
    "@type": "ImageObject",
    url: abs(site, ogImage.src),
    width: 1200,
    height: 630,
    caption: t("og.imageAlt"),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Restaurant",
        "@id": restaurantId,
        name: "Nami",
        alternateName: ["Nami Restaurant", "Nami Barcelona"],
        slogan: t("seo.slogan"),
        description: t("seo.schemaDescription"),
        url: home,
        image: [
          shareImage,
          ...pageImages(site)
            .slice(0, 4)
            .map((photo) => ({
              "@type": "ImageObject",
              url: photo.loc,
              caption: photo.caption,
            })),
        ],
        logo: abs(site, "/icon-512.png"),
        telephone,
        email: contact.email,
        priceRange: "€€€",
        servesCuisine: [
          t("seo.cuisineJapanese"),
          t("seo.cuisineNikkei"),
          t("seo.cuisineMediterranean"),
        ],
        currenciesAccepted: "EUR",
        acceptsReservations: true,
        menu: links.menu,
        hasMenu: {
          "@type": "Menu",
          name: t("seo.menuName"),
          url: links.menu,
          hasMenuSection: [
            {
              "@type": "MenuSection",
              name: t("menu.eyebrow"),
              hasMenuItem: dishes.map((dish) => {
                const detail = t(`menu.dishes.${dish.id}.detail`);
                return {
                  "@type": "MenuItem",
                  name: t(`menu.dishes.${dish.id}.name`),
                  ...(detail ? { description: detail } : {}),
                };
              }),
            },
            {
              "@type": "MenuSection",
              name: t("experiences.eyebrow"),
              hasMenuItem: [
                ...experiences.map((exp) => ({
                  "@type": "MenuItem",
                  name: t(`experiences.${exp.id}.name`),
                  description: `${t(`experiences.${exp.id}.description`)} ${t("experiences.perPerson", { price: formatPrice(exp.price / 2, locale) })}.`,
                  offers: {
                    "@type": "Offer",
                    price: String(exp.price),
                    priceCurrency: "EUR",
                  },
                })),
                {
                  "@type": "MenuItem",
                  name: t("experiences.pairing.name"),
                  description: t("experiences.pairing.description"),
                  offers: {
                    "@type": "Offer",
                    price: String(pairing.price),
                    priceCurrency: "EUR",
                  },
                },
              ],
            },
          ],
        },
        address: {
          "@type": "PostalAddress",
          streetAddress: contact.street,
          postalCode: contact.postalCode,
          addressLocality: contact.locality,
          addressRegion: "Cataluña",
          addressCountry: "ES",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: contact.lat,
          longitude: contact.lon,
        },
        hasMap: links.maps,
        openingHoursSpecification: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: WEEK,
          opens: "13:00",
          closes: "00:00",
        },
        contactPoint: {
          "@type": "ContactPoint",
          telephone,
          contactType: "reservations",
        },
        sameAs: [links.instagram, "https://nami-sushi.nami-sushi.workers.dev/"],
        mainEntityOfPage: { "@id": webpageId },
        potentialAction: {
          "@type": "ReserveAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: links.reserve,
            inLanguage: locale,
            actionPlatform: [
              "https://schema.org/DesktopWebPlatform",
              "https://schema.org/MobileWebPlatform",
            ],
          },
          result: {
            "@type": "FoodEstablishmentReservation",
            name: t("seo.reservationName"),
          },
        },
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: home,
        name: "Nami",
        alternateName: "Nami Barcelona",
        description: t("seo.description"),
        inLanguage: locale,
        publisher: { "@id": restaurantId },
      },
      {
        "@type": "WebPage",
        "@id": webpageId,
        url: home,
        name: t("seo.title"),
        description: t("seo.description"),
        inLanguage: locale,
        isPartOf: { "@id": websiteId },
        about: { "@id": restaurantId },
        mainEntity: { "@id": restaurantId },
        primaryImageOfPage: shareImage,
      },
      {
        "@type": "FAQPage",
        "@id": new URL(`${localizedHome}#faq`, site).href,
        url: new URL(`${localizedHome}#questions`, site).href,
        inLanguage: locale,
        isPartOf: { "@id": webpageId },
        mainEntity: faqIds.map((id) => ({
          "@type": "Question",
          name: t(`faq.items.${id}.q`),
          acceptedAnswer: { "@type": "Answer", text: t(`faq.items.${id}.a`) },
        })),
      },
    ],
  };
}
