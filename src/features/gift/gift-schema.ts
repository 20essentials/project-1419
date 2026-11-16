import { getT, type Locale } from "@/shared/i18n/t";
import { localizedPathname } from "@/shared/i18n/routing";
import { experiences } from "@/shared/site/nami";

export function giftStructuredData(site: URL, locale: Locale) {
  const t = getT(locale);
  const page = new URL(localizedPathname("/gift/", locale), site).href;
  const home = localizedPathname("/", locale);
  const restaurantId = new URL(`${home}#restaurant`, site).href;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: t("gift.landing.title"),
        description: t("seo.gift.description"),
        image: new URL("/og-image.jpg", site).href,
        brand: { "@type": "Brand", name: "Nami" },
        offers: experiences.map((exp) => ({
          "@type": "Offer",
          name: t(`experiences.${exp.id}.name`),
          price: String(exp.price),
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          url: page,
        })),
      },
      {
        "@type": "WebPage",
        "@id": new URL(`${page}#webpage`, site).href,
        url: page,
        name: t("seo.gift.title"),
        description: t("seo.gift.description"),
        inLanguage: locale,
        about: { "@id": restaurantId },
      },
    ],
  };
}
