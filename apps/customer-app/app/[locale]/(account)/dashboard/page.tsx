import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { userRepository } from '@/lib/repositories/user.repository';
import DashboardClient from '@/components/DashboardClient';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: t('panelTitle'),
    description: t('panelDesc'),
    robots: { index: false, follow: false },
  };
}

export default async function DashboardPage(props: Props) {
  const params = await props.params;
  setRequestLocale(params.locale);

  const [profile, membership, history, orders] = await Promise.all([
    userRepository.getProfile(),
    userRepository.getMembership(),
    userRepository.getVisitHistory(),
    userRepository.getOrders(),
  ]);

  return (
    <DashboardClient
      profile={profile}
      membership={membership}
      history={history}
      orders={orders}
    />
  );
}
