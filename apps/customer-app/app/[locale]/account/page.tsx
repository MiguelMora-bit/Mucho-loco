import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import AccountClient from '@/components/AccountClient';
import { buildAlternates } from '@/lib/seo';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: t('accountTitle'),
    description: t('accountDesc'),
    alternates: buildAlternates('/account', locale),
  };
}

export default async function AccountPage(props: Props) {
  const params = await props.params;
  setRequestLocale(params.locale);
  return (
    <Suspense fallback={<div className="bg-ml-black min-h-screen" />}>
      <AccountClient />
    </Suspense>
  );
}
