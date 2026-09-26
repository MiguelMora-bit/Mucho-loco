'use client';
import { useState } from 'react';
import type { NewWorkout, Translations } from '@mucho-loco/types';
import { workoutDay, workoutProblem } from '@mucho-loco/customer-core/workouts';

interface SetDraft { reps: string; weightKg: string }
interface ExerciseDraft { name: string; sets: SetDraft[] }

const EMPTY_SET: SetDraft = { reps: '', weightKg: '' };
const INPUT = 'w-full px-3 py-2 bg-ml-black border border-ml-border text-ml-cream text-sm focus:outline-none focus:border-ml-red';
const LABEL = 'block font-mono text-10 uppercase tracking-wide-xl text-ml-cream-dim mb-1';
const GHOST = 'px-3 py-2 border border-ml-border text-ml-cream-dim font-bebas tracking-wide text-sm bg-transparent cursor-pointer hover:text-ml-cream';

/** Kilos vacíos = peso corporal (0); acepta coma decimal ("22,5"). Reps vacías no pasan la validación. */
function toNewWorkout(name: string, dayOffset: number, duration: string, exercises: ExerciseDraft[]): NewWorkout {
  return {
    date: workoutDay(dayOffset),
    name,
    durationMinutes: duration.trim() ? Number(duration) : null,
    exercises: exercises.map((e) => ({
      name: e.name,
      sets: e.sets.map((s) => ({
        reps: s.reps.trim() ? Number(s.reps) : Number.NaN,
        weightKg: s.weightKg.trim() ? Number(s.weightKg.replace(',', '.')) : 0,
      })),
    })),
  };
}

interface WorkoutFormProps {
  t: Translations;
  /** Manda lo registrado; si falla, el formulario lo dice. */
  onSave: (input: NewWorkout) => Promise<void>;
  onCancel: () => void;
}

/**
 * Registrar un entrenamiento desde la web (spec 021): el mismo formulario que
 * el móvil (`app/workout/new.tsx`), con la misma validación antes de mandar.
 */
export function WorkoutForm({ t, onSave, onCancel }: WorkoutFormProps) {
  const copy = t.performance.workouts;
  const [name, setName] = useState('');
  const [dayOffset, setDayOffset] = useState(0);
  const [duration, setDuration] = useState('');
  const [exercises, setExercises] = useState<ExerciseDraft[]>([{ name: '', sets: [EMPTY_SET] }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateExercise = (index: number, change: (e: ExerciseDraft) => ExerciseDraft) =>
    setExercises((all) => all.map((e, i) => (i === index ? change(e) : e)));
  const updateSet = (exercise: number, index: number, change: Partial<SetDraft>) =>
    updateExercise(exercise, (e) => ({ ...e, sets: e.sets.map((s, i) => (i === index ? { ...s, ...change } : s)) }));

  async function save() {
    const input = toNewWorkout(name, dayOffset, duration, exercises);
    if (workoutProblem(input)) {
      setError(copy.invalid);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(input);
    } catch {
      setError(copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-ml-card-2 border border-ml-border p-5 mb-5 space-y-4">
      <div className="font-display text-22">{copy.logTitle}</div>
      <div className="grid grid-cols-[2fr_1fr_1fr] gap-3 items-end">
        <div>
          <label htmlFor="workout-name" className={LABEL}>{copy.nameLabel}</label>
          <input id="workout-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={copy.namePlaceholder} className={INPUT} />
        </div>
        <div>
          <span className={LABEL}>{copy.dayLabel}</span>
          <div className="flex gap-2">
            {[[0, copy.today], [-1, copy.yesterday]].map(([offset, label]) => (
              <button
                key={label}
                type="button"
                aria-pressed={dayOffset === offset}
                onClick={() => setDayOffset(offset as number)}
                className={'flex-1 py-2 font-bebas tracking-wide text-sm border cursor-pointer ' + (dayOffset === offset ? 'bg-ml-red border-ml-red text-ml-cream' : 'bg-transparent border-ml-border text-ml-cream-dim')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="workout-duration" className={LABEL}>{copy.durationLabel}</label>
          <input id="workout-duration" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="45" className={INPUT} />
        </div>
      </div>

      {exercises.map((exercise, e) => (
        <div key={e} className="border border-ml-border p-4 space-y-3">
          <div>
            <label htmlFor={`exercise-${e}`} className={LABEL}>{copy.exerciseLabel} {e + 1}</label>
            <input
              id={`exercise-${e}`}
              value={exercise.name}
              onChange={(ev) => updateExercise(e, (x) => ({ ...x, name: ev.target.value }))}
              placeholder={copy.exercisePlaceholder}
              className={INPUT}
            />
          </div>
          {exercise.sets.map((set, s) => (
            <div key={s} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <div>
                <label htmlFor={`reps-${e}-${s}`} className={LABEL}>{copy.repsLabel} {e + 1}.{s + 1}</label>
                <input id={`reps-${e}-${s}`} inputMode="numeric" value={set.reps} onChange={(ev) => updateSet(e, s, { reps: ev.target.value })} placeholder="8" className={INPUT} />
              </div>
              <div>
                <label htmlFor={`kg-${e}-${s}`} className={LABEL}>{copy.weightLabel} {e + 1}.{s + 1}</label>
                <input id={`kg-${e}-${s}`} inputMode="decimal" value={set.weightKg} onChange={(ev) => updateSet(e, s, { weightKg: ev.target.value })} placeholder="0" className={INPUT} />
              </div>
              {exercise.sets.length > 1 ? (
                <button
                  type="button"
                  aria-label={`${copy.removeSet} ${e + 1}.${s + 1}`}
                  onClick={() => updateExercise(e, (x) => ({ ...x, sets: x.sets.filter((_, i) => i !== s) }))}
                  className="px-3 py-2 text-ml-cream-dim bg-transparent border-none cursor-pointer"
                >
                  ✕
                </button>
              ) : <span />}
            </div>
          ))}
          <div className="flex gap-2">
            {/* La serie nueva copia la anterior: casi siempre se repiten reps y peso. */}
            <button type="button" className={GHOST} onClick={() => updateExercise(e, (x) => ({ ...x, sets: [...x.sets, { ...x.sets[x.sets.length - 1] }] }))}>
              {copy.addSet}
            </button>
            {exercises.length > 1 && (
              <button type="button" className={GHOST} onClick={() => setExercises((all) => all.filter((_, i) => i !== e))}>
                {copy.removeExercise}
              </button>
            )}
          </div>
        </div>
      ))}

      <button type="button" className={GHOST + ' w-full'} onClick={() => setExercises((all) => [...all, { name: '', sets: [EMPTY_SET] }])}>
        {copy.addExercise}
      </button>
      {error && <p role="alert" className="text-sm text-ml-red-bright">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={save} disabled={saving} className="flex-1 py-3 bg-ml-red text-ml-cream font-bebas tracking-wide text-lg border-none cursor-pointer disabled:opacity-50">
          {saving ? copy.saving : copy.save}
        </button>
        <button type="button" onClick={onCancel} className={GHOST}>{t.dashboard.phone.cancel}</button>
      </div>
    </div>
  );
}
