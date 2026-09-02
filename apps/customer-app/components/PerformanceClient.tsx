'use client';

import { useState } from 'react';
import { Overview, WorkoutsList, Heatmap } from './performance';
import type { Workout, PerformanceStat, PersonalRecord, HeatmapLevel } from '@/lib/types/performance';

type ViewKey = 'overview' | 'workouts' | 'heatmap';

interface PerformanceClientProps {
  stats: PerformanceStat[];
  records: PersonalRecord[];
  workouts: Workout[];
  heatmap: HeatmapLevel[][];
}

export default function PerformanceClient({ stats, records, workouts, heatmap }: PerformanceClientProps) {
  const [view, setView] = useState<ViewKey>('overview');

  return (
    <div className="max-w-[1200px] mx-auto pt-8 px-8 pb-20">
      <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
        <div>
          <div className="font-mono text-11 text-ml-orange tracking-wide-xl uppercase mb-1.5">📈 MI RENDIMIENTO</div>
          <h1 className="font-display text-[clamp(40px,5vw,64px)] leading-[0.95]">ESTADÍSTICAS<br /><span className="text-ml-red">Y PROGRESO</span></h1>
        </div>
        <div className="flex gap-2">
          {(['overview', 'workouts', 'heatmap'] as ViewKey[]).map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-4.5 py-2.5 font-bebas tracking-wide text-sm cursor-pointer uppercase text-ml-cream border ${view === v ? 'bg-ml-red border-ml-red' : 'bg-ml-card border-ml-border'}`}>
              {v === 'overview' ? 'RESUMEN' : v === 'workouts' ? 'ENTRENAMIENTOS' : 'HEATMAP'}
            </button>
          ))}
        </div>
      </div>

      {view === 'overview' && <Overview stats={stats} records={records} />}
      {view === 'workouts' && <WorkoutsList workouts={workouts} />}
      {view === 'heatmap' && <Heatmap heatmap={heatmap} />}
    </div>
  );
}
