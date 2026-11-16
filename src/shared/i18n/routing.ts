import { defaultLocale, locales, type Locale } from "./t";

const prefixPattern = new RegExp(`^/(?:${locales.join("|")})(?=/|$)`);

export function localeFromPathname(pathname: string): Locale {
  const first = pathname.split("/")[1];
  return locales.includes(first as Locale) ? (first as Locale) : defaultLocale;
}

export function localizedPathname(pathname: string, locale: Locale): string {
  const base = pathname.replace(prefixPattern, "");
  const suffix = base.endsWith("/") ? base : `${base}/`;
  return locale === defaultLocale ? suffix : `/${locale}${suffix}`;
}
