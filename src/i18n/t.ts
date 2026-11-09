import translations from '../translations.json' with { type: 'json' };
import esTranslations from '../../.wix/multilingual/translations/es.json' with { type: 'json' };
import itTranslations from '../../.wix/multilingual/translations/it.json' with { type: 'json' };

export const locales = ['en', 'es', 'it'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

type Dictionary = Record<string, string>;

const dictionaries: Record<Locale, Dictionary> = {
  en: translations as Dictionary,
  es: { ...(translations as Dictionary), ...esTranslations },
  it: itTranslations,
};

export type TFunc = (key: string, params?: Record<string, string | number>) => string;

export function getT(locale?: string): TFunc {
  const dictionary = locales.includes(locale as Locale) ? dictionaries[locale as Locale] : dictionaries[defaultLocale];
  return (key, params = {}) => {
    let value = dictionary[key] ?? dictionaries[defaultLocale][key] ?? key;
    for (const [name, param] of Object.entries(params)) {
      value = value.split(`{${name}}`).join(String(param));
    }
    return value;
  };
}

export function hasKey(key: string, locale: Locale = defaultLocale): boolean {
  return key in (dictionaries[locale] ?? {}) || key in dictionaries[defaultLocale];
}

export function formatPrice(amount: number, locale: Locale = defaultLocale): string {
  return locale === 'es' ? `${amount} €` : `€${amount}`;
}

export function formatPairing(amount: number, locale: Locale = defaultLocale): string {
  return `+${formatPrice(amount, locale)}`;
}
