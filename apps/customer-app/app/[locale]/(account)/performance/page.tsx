import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { performanceRepository } from '@/lib/repositories/performance.repository';
import PerformanceClient from '@/components/PerformanceClient';
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
    title: t('performanceTitle'),
    description: t('performanceDesc'),
    alternates: buildAlternates('/performance', locale),
    robots: { index: false, follow: false },
  };
}

export default async function PerformancePage(props: Props) {
  const params = await props.params;
  setRequestLocale(params.locale);

  // Entrenamientos (spec 017) y heatmap (spec 016) son del socio: hace falta saber quién es.
  const email = await getCurrentUserEmail();
  if (!email) return redirect({ href: '/account', locale: params.locale });

  const [stats, records, workouts, heatmap] = await Promise.all([
    performanceRepository.getStats(),
    performanceRepository.getPersonalRecords(),
    performanceRepository.getWorkouts(email),
    performanceRepository.getHeatmap(email),
  ]);

  return <PerformanceClient stats={stats} records={records} workouts={workouts} heatmap={heatmap} />;
}
