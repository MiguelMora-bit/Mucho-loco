import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { performanceRepository } from '@/lib/repositories/performance.repository';
import PerformanceClient from '@/components/PerformanceClient';

interface Props {
  params: { locale: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: t('rendimientoTitle'),
    description: t('rendimientoDesc'),
    robots: { index: false, follow: false },
  };
}

export default async function PerformancePage({ params }: Props) {
  setRequestLocale(params.locale);

  const [stats, records, workouts, heatmap] = await Promise.all([
    performanceRepository.getStats(),
    performanceRepository.getPersonalRecords(),
    performanceRepository.getWorkouts(),
    performanceRepository.getHeatmap(),
  ]);

  return <PerformanceClient stats={stats} records={records} workouts={workouts} heatmap={heatmap} />;
}
