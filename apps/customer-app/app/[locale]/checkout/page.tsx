import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import CheckoutClient from '@/components/CheckoutClient';
import { buildAlternates } from '@/lib/seo';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: t('checkoutTitle'),
    description: t('checkoutDesc'),
    alternates: buildAlternates('/checkout', locale),
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage(props: Props) {
  const params = await props.params;
  setRequestLocale(params.locale);
  return <CheckoutClient />;
}
