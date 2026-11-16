import { getT, type Locale } from "@/shared/i18n/t";
import { localizedPathname } from "@/shared/i18n/routing";
import { links } from "@/shared/site/nami";

export function reserveStructuredData(site: URL, locale: Locale) {
  const t = getT(locale);
  const home = localizedPathname("/", locale);
  const page = new URL(localizedPathname("/reserve/", locale), site).href;
  const restaurantId = new URL(`${home}#restaurant`, site).href;
  const websiteId = new URL(`${home}#website`, site).href;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Restaurant",
        "@id": restaurantId,
        name: "Nami",
        url: new URL(home, site).href,
        telephone: links.phone.replace("tel:", ""),
        acceptsReservations: true,
        potentialAction: {
          "@type": "ReserveAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: page,
            inLanguage: locale,
            actionPlatform: [
              "https://schema.org/DesktopWebPlatform",
              "https://schema.org/MobileWebPlatform",
            ],
          },
          result: {
            "@type": "FoodEstablishmentReservation",
            name: t("reserve.title"),
          },
        },
      },
      {
        "@type": "WebPage",
        "@id": new URL(`${page}#webpage`, site).href,
        url: page,
        name: t("seo.reserve.title"),
        description: t("seo.reserve.description"),
        inLanguage: locale,
        isPartOf: { "@id": websiteId },
        about: { "@id": restaurantId },
      },
    ],
  };
}
