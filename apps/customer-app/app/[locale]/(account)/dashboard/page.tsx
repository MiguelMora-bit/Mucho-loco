import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { userRepository } from '@/lib/repositories/user.repository';
import DashboardClient from '@/components/DashboardClient';
import { buildAlternates } from '@/lib/seo';
import { getCurrentUserEmail } from '@/lib/session';
import { redirect } from '@/i18n/routing';

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
    alternates: buildAlternates('/dashboard', locale),
    robots: { index: false, follow: false },
  };
}

export default async function DashboardPage(props: Props) {
  const params = await props.params;
  setRequestLocale(params.locale);

  const email = await getCurrentUserEmail();
  if (!email) {
    // Cookie ausente o inválida (fabricada/expirada) — el middleware solo
    // comprueba que exista, así que esta es la última línea de defensa real.
    return redirect({ href: '/account', locale: params.locale });
  }
  const [profile, membership, history, orders] = await Promise.all([
    userRepository.getProfile(email),
    userRepository.getMembership(email),
    userRepository.getVisitHistory(email),
    userRepository.getOrders(email),
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
