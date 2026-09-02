import { formatDate } from '@/lib/dates';
import type { Workout } from '@/lib/types/performance';
import type { Lang, Translations } from '@mucho-loco/types';

interface WorkoutsListProps {
  t: Translations;
  lang: Lang;
  workouts: Workout[];
}

export function WorkoutsList({ t, lang, workouts }: WorkoutsListProps) {
  return (
    <div className="bg-ml-card border border-ml-border p-5.5">
      <div className="font-display text-22 mb-4.5">{t.performance.workouts.historyPrefix} <span className="text-ml-red">{t.performance.workouts.historyHighlight}</span></div>
      {workouts.map((w, i) => (
        <div key={i} className="workout-row">
          <div>
            <b className="font-display text-22 text-ml-red leading-none">{formatDate(w.date, lang, { day: '2-digit' })}</b>
            <div className="font-mono text-[9px] text-ml-cream-dim tracking-wide">{formatDate(w.date, lang, { month: 'short' })}</div>
          </div>
          <div>
            <b className="text-sm">{w.name[lang]}</b>
            <div className="flex gap-3 mt-1.5 flex-wrap">
              <span className="font-mono text-11 text-ml-cream-dim">{w.sets} {t.performance.workouts.setsUnit}</span>
              <span className="font-mono text-11 text-ml-cream-dim">{w.vol} {t.performance.workouts.volUnit}</span>
              {w.pr && <span className="font-mono text-11 text-ml-green">🏆 {w.pr[lang]}</span>}
            </div>
          </div>
          <div className="font-mono text-[13px] text-ml-orange">{w.duration}</div>
        </div>
      ))}
    </div>
  );
}
