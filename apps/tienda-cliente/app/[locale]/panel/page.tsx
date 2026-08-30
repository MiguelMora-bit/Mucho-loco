import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { userRepository } from '@/lib/repositories/user.repository';
import PanelClient from '@/components/PanelClient';

interface Props {
  params: { locale: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: t('panelTitle'),
    description: t('panelDesc'),
    robots: { index: false, follow: false },
  };
}

export default async function PanelPage({ params }: Props) {
  setRequestLocale(params.locale);

  const [profile, membership, history, orders] = await Promise.all([
    userRepository.getProfile(),
    userRepository.getMembership(),
    userRepository.getVisitHistory(),
    userRepository.getOrders(),
  ]);

  return (
    <PanelClient
      profile={profile}
      membership={membership}
      history={history}
      orders={orders}
    />
  );
}
