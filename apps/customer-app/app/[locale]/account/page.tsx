import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import AccountClient from '@/components/AccountClient';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: t('cuentaTitle'),
    description: t('cuentaDesc'),
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
