import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import MuchoLoco from '@/components/MuchoLoco';
import { branchRepository } from '@/lib/repositories/branch.repository';
import { productRepository } from '@/lib/repositories/product.repository';
import { ANNOUNCEMENTS } from '@/lib/data';

interface Props {
  params: { locale: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const baseUrl = 'https://mucholoco.mx';
  const isEn = locale === 'en';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: 'Mucho Loco Gym',
    description: t('homeDesc'),
    url: isEn ? `${baseUrl}/en` : baseUrl,
    logo: `${baseUrl}/assets/bull-head.png`,
    image: `${baseUrl}/assets/bull-head.png`,
    numberOfLocations: 15,
    areaServed: 'Mexico City Metropolitan Area',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'MX',
      addressLocality: 'Ciudad de México',
    },
    sameAs: [
      'https://www.instagram.com/mucholoco.fit',
      'https://www.tiktok.com/@mucholoco',
      'https://www.facebook.com/mucholocogym',
    ],
  };

  return {
    title: t('homeTitle'),
    description: t('homeDesc'),
    alternates: {
      canonical: isEn ? `${baseUrl}/en` : baseUrl,
      languages: { es: baseUrl, en: `${baseUrl}/en` },
    },
    other: {
      'script:ld+json': JSON.stringify(jsonLd),
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);

  const [branches, products] = await Promise.all([
    branchRepository.getAll(),
    productRepository.getAll(),
  ]);

  return (
    <MuchoLoco
      branches={branches}
      products={products}
      announcements={ANNOUNCEMENTS}
    />
  );
}
