'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useT } from '@/lib/hooks/useT';
import { Overview, WorkoutsList, Heatmap } from './performance';
import type { Workout, PerformanceSummary, PersonalRecord, HeatmapLevel } from '@/lib/types/performance';
import type { Lang } from '@mucho-loco/types';

type ViewKey = 'overview' | 'workouts' | 'heatmap';

interface PerformanceClientProps {
  summary: PerformanceSummary;
  records: PersonalRecord[];
  workouts: Workout[];
  heatmap: HeatmapLevel[][];
}

export default function PerformanceClient({ summary, records, workouts, heatmap }: PerformanceClientProps) {
  const t = useT();
  const lang = useLocale() as Lang;
  const [view, setView] = useState<ViewKey>('overview');

  return (
    <div className="max-w-[1200px] mx-auto pt-8 px-8 pb-20">
      <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
        <div>
          <div className="font-mono text-11 text-ml-orange tracking-wide-xl uppercase mb-1.5">{t.performance.eyebrow}</div>
          <h1 className="font-display text-[clamp(40px,5vw,64px)] leading-[0.95]">{t.performance.titleA}<br /><span className="text-ml-red">{t.performance.titleB}</span></h1>
        </div>
        <div className="flex gap-2">
          {(['overview', 'workouts', 'heatmap'] as ViewKey[]).map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-4.5 py-2.5 font-bebas tracking-wide text-sm cursor-pointer uppercase text-ml-cream border ${view === v ? 'bg-ml-red border-ml-red' : 'bg-ml-card border-ml-border'}`}>
              {t.performance.tabs[v]}
            </button>
          ))}
        </div>
      </div>

      {view === 'overview' && <Overview t={t} lang={lang} summary={summary} records={records} />}
      {view === 'workouts' && <WorkoutsList t={t} lang={lang} workouts={workouts} />}
      {view === 'heatmap' && <Heatmap t={t} heatmap={heatmap} />}
    </div>
  );
}
