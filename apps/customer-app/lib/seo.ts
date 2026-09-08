export const SITE_URL = 'https://mucholoco.mx';

/** Absolute URL for `path` (e.g. '/', '/product/p1') in the given locale, respecting the 'as-needed' locale prefix (es = no prefix, en = /en). */
export function localizedUrl(path: string, locale: string): string {
  const suffix = path === '/' ? '' : path;
  return locale === 'en' ? `${SITE_URL}/en${suffix}` : `${SITE_URL}${suffix}`;
}

/** hreflang + canonical block for a page, keyed by its path across all locales. */
export function buildAlternates(path: string, locale: string) {
  return {
    canonical: localizedUrl(path, locale),
    languages: {
      es: localizedUrl(path, 'es'),
      en: localizedUrl(path, 'en'),
      'x-default': localizedUrl(path, 'es'),
    },
  };
}
