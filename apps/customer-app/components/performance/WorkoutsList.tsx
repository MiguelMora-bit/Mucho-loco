import { formatDate, formatDuration } from '@/lib/dates';
import type { Workout } from '@/lib/types/performance';
import type { Lang, Translations } from '@mucho-loco/types';
import { formatKg } from '@mucho-loco/customer-core/workouts';

interface WorkoutsListProps {
  t: Translations;
  lang: Lang;
  workouts: Workout[];
}

/**
 * Los entrenamientos que registró el socio (spec 017). Se registran desde la
 * app del teléfono (lo que se lleva al gimnasio); aquí solo se consultan.
 */
export function WorkoutsList({ t, lang, workouts }: WorkoutsListProps) {
  const copy = t.performance.workouts;
  return (
    <div className="bg-ml-card border border-ml-border p-5.5">
      <div className="font-display text-22 mb-4.5">{copy.historyPrefix} <span className="text-ml-red">{copy.historyHighlight}</span></div>
      {workouts.length === 0 && (
        <p className="text-sm text-ml-cream-dim">
          {copy.empty} {copy.emptyWeb}
        </p>
      )}
      {workouts.map((w) => (
        <div key={w.id} className="workout-row">
          <div>
            <b className="font-display text-22 text-ml-red leading-none">{formatDate(w.date, lang, { day: '2-digit' })}</b>
            <div className="font-mono text-[9px] text-ml-cream-dim tracking-wide">{formatDate(w.date, lang, { month: 'short' })}</div>
          </div>
          <div>
            <b className="text-sm">{w.name}</b>
            <div className="flex gap-3 mt-1.5 flex-wrap">
              <span className="font-mono text-11 text-ml-cream-dim">{w.setCount} {copy.setsUnit}</span>
              <span className="font-mono text-11 text-ml-cream-dim">{formatKg(w.volumeKg, lang)} {copy.kgUnit} {copy.volUnit}</span>
              {w.prs.map((pr) => (
                <span key={pr.exercise} className="font-mono text-11 text-ml-green">🏆 {pr.exercise} · {formatKg(pr.weightKg, lang)} {copy.kgUnit}</span>
              ))}
            </div>
          </div>
          <div className="font-mono text-[13px] text-ml-orange">{formatDuration(w.durationMinutes, lang)}</div>
        </div>
      ))}
    </div>
  );
}
