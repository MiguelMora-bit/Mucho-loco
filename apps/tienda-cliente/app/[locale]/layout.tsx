import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { Anton, Bebas_Neue, Inter, JetBrains_Mono, Permanent_Marker } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Providers } from '../providers';
import '../globals.css';

const anton = Anton({ subsets: ['latin'], weight: '400', variable: '--font-anton', display: 'swap' });
const bebasNeue = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-bebas', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });
const permanentMarker = Permanent_Marker({ subsets: ['latin'], weight: '400', variable: '--font-marker', display: 'swap' });

type Locale = (typeof routing.locales)[number];

interface LocaleLayoutProps {
  children: ReactNode;
  params: { locale: string };
}

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const isEn = locale === 'en';
  const baseUrl = 'https://mucholoco.mx';
  const canonical = isEn ? `${baseUrl}/en` : baseUrl;

  return {
    title: {
      default: t('homeTitle'),
      template: `%s · MUCHO LOCO GYM`,
    },
    description: t('homeDesc'),
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical,
      languages: {
        es: baseUrl,
        en: `${baseUrl}/en`,
      },
    },
    openGraph: {
      siteName: 'Mucho Loco Gym',
      locale: isEn ? 'en_US' : 'es_MX',
      alternateLocale: isEn ? 'es_MX' : 'en_US',
      type: 'website',
      url: canonical,
      title: t('homeTitle'),
      description: t('homeDesc'),
      images: [{ url: '/assets/bull-head.png', width: 512, height: 512, alt: 'Mucho Loco Gym' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('homeTitle'),
      description: t('homeDesc'),
    },
    icons: { icon: '/assets/bull-head.png' },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const fontClasses = [
    anton.variable,
    bebasNeue.variable,
    inter.variable,
    jetbrainsMono.variable,
    permanentMarker.variable,
  ].join(' ');

  return (
    <html lang={locale} className={fontClasses}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
