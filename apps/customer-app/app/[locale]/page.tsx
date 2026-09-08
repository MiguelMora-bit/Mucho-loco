import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import MuchoLoco from '@/components/MuchoLoco';
import { branchRepository } from '@/lib/repositories/branch.repository';
import { productRepository } from '@/lib/repositories/product.repository';
import { announcementRepository } from '@/lib/repositories/announcement.repository';
import { membershipRepository } from '@/lib/repositories/membership.repository';
import { socialRepository } from '@/lib/repositories/social.repository';
import { SITE_URL, buildAlternates } from '@/lib/seo';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const alternates = buildAlternates('/', locale);

  return {
    title: t('homeTitle'),
    description: t('homeDesc'),
    alternates,
  };
}

export default async function HomePage(props: Props) {
  const params = await props.params;
  const { locale } = params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'meta' });
  const alternates = buildAlternates('/', locale);

  const [branches, products, announcements, membershipTiers, socialLinks, socialFeed] = await Promise.all([
    branchRepository.getAll(),
    productRepository.getAll(),
    announcementRepository.getAll(),
    membershipRepository.getTiers(),
    socialRepository.getLinks(),
    socialRepository.getFeed(),
  ]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: 'Mucho Loco Gym',
    description: t('homeDesc'),
    url: alternates.canonical,
    logo: `${SITE_URL}/assets/bull-head.png`,
    image: `${SITE_URL}/assets/bull-head.png`,
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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MuchoLoco
        branches={branches}
        products={products}
        announcements={announcements}
        membershipTiers={membershipTiers}
        socialLinks={socialLinks}
        socialFeed={socialFeed}
      />
    </>
  );
}
