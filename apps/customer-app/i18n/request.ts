import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

type Locale = (typeof routing.locales)[number];

// Los textos viven en @mucho-loco/customer-core porque mobile-app usa los
// mismos. Mapa con imports literales y no `import(`…/${locale}.json`)`: que el
// bundler resuelva un template contra un paquete depende de cada uno (webpack
// en build, Turbopack en dev); dos imports literales funcionan en ambos. Y un
// locale nuevo en routing sin su entrada aquí no compila.
const MESSAGES: Record<Locale, () => Promise<{ default: Record<string, unknown> }>> = {
  es: () => import('@mucho-loco/customer-core/messages/es.json'),
  en: () => import('@mucho-loco/customer-core/messages/en.json'),
};

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? routing.defaultLocale;

  if (!routing.locales.includes(locale as Locale)) {
    const { notFound } = await import('next/navigation');
    notFound();
  }

  return {
    locale,
    messages: (await MESSAGES[locale as Locale]()).default,
  };
});
