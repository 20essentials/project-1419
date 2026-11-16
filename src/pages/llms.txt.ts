import type { APIRoute } from "astro";
import { getT, formatPrice, formatPairing } from "@/shared/i18n/t";
import {
  contact,
  experiences,
  faqIds,
  links,
  pairing,
} from "@/shared/site/nami";

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error("Falta site en astro.config.mjs");
  const t = getT();
  const home = new URL("/", site).href;
  const experienceLines = experiences
    .map(
      (exp) =>
        `- ${t(`experiences.${exp.id}.name`)}: ${formatPrice(exp.price)} (${t("experiences.perPerson", { price: formatPrice(exp.price / 2) })}). ${t(`experiences.${exp.id}.description`)}`,
    )
    .join("\n");
  const questions = faqIds
    .map((id) => `### ${t(`faq.items.${id}.q`)}\n\n${t(`faq.items.${id}.a`)}`)
    .join("\n\n");
  const body = `# Nami

> ${t("seo.description")}

${t("llms.intro")}

## ${t("llms.facts")}

- ${t("llms.address")}: ${contact.street}, ${contact.city} (${contact.neighborhood})
- ${t("llms.hours")}: ${t("contact.hoursText")}. ${t("contact.kitchenUntil")}.
- ${t("llms.phone")}: ${contact.phone}
- ${t("llms.email")}: ${contact.email}
- ${t("llms.cuisine")}
${experienceLines}
- ${t("experiences.pairing.name")}: ${formatPairing(pairing.price)}. ${t("experiences.pairing.description")}
- ${t("llms.menu")}: ${links.menu}
- ${t("llms.reservations")}: ${links.reserve}
- ${t("llms.gifting")}: ${links.gift}
- Instagram: ${links.instagram}
- ${t("llms.page")}: ${home}

## ${t("faq.eyebrow")}

${questions}
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
