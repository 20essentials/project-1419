import type { APIRoute } from 'astro';
import { getT, formatPrice, formatPairing } from '@/shared/i18n/t';
import { contacto, experiencias, faqIds, links, maridaje } from '@/shared/site/nami';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error('Falta site en astro.config.mjs');
  const t = getT();
  const home = new URL('/', site).href;
  const experienceLines = experiencias
    .map(
      (exp) =>
        `- ${t(`experiences.${exp.id}.name`)}: ${formatPrice(exp.price)} (${t('experiences.perPerson', { price: formatPrice(exp.price / 2) })}). ${t(`experiences.${exp.id}.description`)}`,
    )
    .join('\n');
  const questions = faqIds
    .map((id) => `### ${t(`faq.items.${id}.q`)}\n\n${t(`faq.items.${id}.a`)}`)
    .join('\n\n');
  const body = `# Nami

> ${t('seo.description')}

${t('llms.intro')}

## ${t('llms.facts')}

- ${t('llms.address')}: ${contacto.calle}, ${contacto.ciudad} (${contacto.barrio})
- ${t('llms.hours')}: ${t('contact.hoursText')}. ${t('contact.kitchenUntil')}.
- ${t('llms.phone')}: ${contacto.telefono}
- ${t('llms.email')}: ${contacto.email}
- ${t('llms.cuisine')}
${experienceLines}
- ${t('experiences.pairing.name')}: ${formatPairing(maridaje.price)}. ${t('experiences.pairing.description')}
- ${t('llms.menu')}: ${links.carta}
- ${t('llms.reservations')}: ${links.reservar}
- ${t('llms.gifting')}: ${links.regalar}
- Instagram: ${links.instagram}
- ${t('llms.page')}: ${home}

## ${t('faq.eyebrow')}

${questions}
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
