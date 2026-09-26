'use client';
import { useState } from 'react';
import { formatDate, formatDuration } from '@/lib/dates';
import type { Workout } from '@/lib/types/performance';
import type { Lang, NewWorkout, Translations } from '@mucho-loco/types';
import { formatKg } from '@mucho-loco/customer-core/workouts';
import { useRouter } from '@/i18n/routing';
import { deleteRequest, postJson } from '@/lib/api-client';
import { WorkoutForm } from './WorkoutForm';

interface WorkoutsListProps {
  t: Translations;
  lang: Lang;
  workouts: Workout[];
}

/**
 * Los entrenamientos del socio (spec 017), y desde el spec 021 también se
 * registran y se borran aquí. Tras cada cambio se relee la página del
 * servidor: los récords y el Resumen dependen de TODOS los entrenamientos.
 */
export function WorkoutsList({ t, lang, workouts }: WorkoutsListProps) {
  const copy = t.performance.workouts;
  const router = useRouter();
  const [logging, setLogging] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);

  async function save(input: NewWorkout) {
    await postJson<Workout>('/api/performance/workouts', input);
    setLogging(false);
    router.refresh();
  }

  async function remove(id: string) {
    setDeleteFailed(false);
    try {
      await deleteRequest(`/api/performance/workouts/${encodeURIComponent(id)}`);
      setConfirming(null);
      router.refresh();
    } catch {
      setDeleteFailed(true);
    }
  }

  return (
    <div className="bg-ml-card border border-ml-border p-5.5">
      <div className="flex items-center justify-between mb-4.5 gap-4 flex-wrap">
        <div className="font-display text-22">{copy.historyPrefix} <span className="text-ml-red">{copy.historyHighlight}</span></div>
        {!logging && (
          <button type="button" onClick={() => setLogging(true)} className="px-5 py-2.5 bg-ml-red text-ml-cream font-bebas tracking-wide text-sm border-none cursor-pointer">
            {copy.log}
          </button>
        )}
      </div>
      {logging && <WorkoutForm t={t} onSave={save} onCancel={() => setLogging(false)} />}
      {workouts.length === 0 && !logging && <p className="text-sm text-ml-cream-dim">{copy.empty}</p>}
      {deleteFailed && <p role="alert" className="text-sm text-ml-red-bright mb-2">{copy.deleteError}</p>}
      {workouts.map((w) => (
        <div key={w.id} className="workout-row">
          <div>
            <b className="font-display text-22 text-ml-red leading-none">{formatDate(w.date, lang, { day: '2-digit' })}</b>
            <div className="font-mono text-[9px] text-ml-cream-dim tracking-wide">{formatDate(w.date, lang, { month: 'short' })}</div>
          </div>
          <div>
            <b className="text-sm">{w.name}</b>
            <div className="flex gap-3 mt-1.5 flex-wrap items-center">
              <span className="font-mono text-11 text-ml-cream-dim">{w.setCount} {copy.setsUnit}</span>
              <span className="font-mono text-11 text-ml-cream-dim">{formatKg(w.volumeKg, lang)} {copy.kgUnit} {copy.volUnit}</span>
              {w.prs.map((pr) => (
                <span key={pr.exercise} className="font-mono text-11 text-ml-green">🏆 {pr.exercise} · {formatKg(pr.weightKg, lang)} {copy.kgUnit}</span>
              ))}
              {confirming === w.id ? (
                <button type="button" onClick={() => remove(w.id)} className="font-bebas tracking-wide text-xs text-ml-red-bright bg-transparent border border-ml-red px-2 py-0.5 cursor-pointer">
                  {copy.confirmDelete}
                </button>
              ) : (
                <button type="button" aria-label={`${copy.delete}: ${w.name}`} onClick={() => setConfirming(w.id)} className="font-mono text-11 text-ml-cream-dim underline bg-transparent border-none cursor-pointer p-0">
                  {copy.delete}
                </button>
              )}
            </div>
          </div>
          <div className="font-mono text-[13px] text-ml-orange">{formatDuration(w.durationMinutes, lang)}</div>
        </div>
      ))}
    </div>
  );
}
