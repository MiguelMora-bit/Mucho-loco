import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { NewWorkout } from '@mucho-loco/types';
import { workoutDay, workoutProblem } from '@mucho-loco/customer-core/workouts';
import { Field } from '@/components/Field';
import { Body, Button, Card, Chip, Mono, Screen } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { performanceRepository } from '@/lib/repositories';
import { useSessionStore } from '@/lib/stores/session.store';
import { colors, space } from '@/theme';

interface SetDraft {
  reps: string;
  weightKg: string;
}
interface ExerciseDraft {
  name: string;
  sets: SetDraft[];
}

const EMPTY_SET: SetDraft = { reps: '', weightKg: '' };

/** Kilos vacíos = peso corporal (0); acepta coma decimal ("22,5"). Repeticiones vacías no pasan la validación. */
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

/**
 * Registrar un entrenamiento (spec 017): lo que el socio hizo, hoy o ayer.
 * Series, volumen y récords los calcula el servidor; aquí solo se valida la
 * forma con la misma regla (`workoutProblem`) antes de mandar.
 */
export default function NewWorkoutScreen() {
  const { t } = useT();
  const copy = t.performance.workouts;
  const router = useRouter();
  const email = useSessionStore((s) => s.session?.email) ?? '';
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
      await performanceRepository.logWorkout(email, input);
      router.back();
    } catch {
      setError(copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen safeTop={false}>
      <Field label={copy.nameLabel} value={name} onChangeText={setName} placeholder={copy.namePlaceholder} />
      <Mono>{copy.dayLabel}</Mono>
      <View style={styles.row}>
        <Chip label={copy.today} active={dayOffset === 0} onPress={() => setDayOffset(0)} />
        <Chip label={copy.yesterday} active={dayOffset === -1} onPress={() => setDayOffset(-1)} />
      </View>
      <Field label={copy.durationLabel} value={duration} onChangeText={setDuration} keyboardType="number-pad" placeholder="45" />

      {exercises.map((exercise, e) => (
        <Card key={e} style={styles.exercise}>
          <Field
            label={`${copy.exerciseLabel} ${e + 1}`}
            value={exercise.name}
            onChangeText={(text) => updateExercise(e, (x) => ({ ...x, name: text }))}
            placeholder={copy.exercisePlaceholder}
          />
          {exercise.sets.map((set, s) => (
            <View key={s} style={styles.set}>
              <View style={styles.fill}>
                <Field
                  label={`${copy.repsLabel} ${e + 1}.${s + 1}`}
                  value={set.reps}
                  onChangeText={(text) => updateSet(e, s, { reps: text })}
                  keyboardType="number-pad"
                  placeholder="8"
                />
              </View>
              <View style={styles.fill}>
                <Field
                  label={`${copy.weightLabel} ${e + 1}.${s + 1}`}
                  value={set.weightKg}
                  onChangeText={(text) => updateSet(e, s, { weightKg: text })}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              </View>
              {exercise.sets.length > 1 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${copy.removeSet} ${e + 1}.${s + 1}`}
                  onPress={() => updateExercise(e, (x) => ({ ...x, sets: x.sets.filter((_, i) => i !== s) }))}
                  style={styles.remove}
                >
                  <Mono>✕</Mono>
                </Pressable>
              )}
            </View>
          ))}
          <View style={styles.row}>
            {/* La serie nueva copia la anterior: casi siempre se repiten reps y peso. */}
            <Button
              title={copy.addSet}
              variant="outline"
              onPress={() => updateExercise(e, (x) => ({ ...x, sets: [...x.sets, { ...x.sets[x.sets.length - 1] }] }))}
            />
            {exercises.length > 1 && (
              <Button
                title={copy.removeExercise}
                variant="outline"
                onPress={() => setExercises((all) => all.filter((_, i) => i !== e))}
              />
            )}
          </View>
        </Card>
      ))}

      <Button
        title={copy.addExercise}
        variant="outline"
        onPress={() => setExercises((all) => [...all, { name: '', sets: [EMPTY_SET] }])}
      />
      {error && <Body style={styles.error}>{error}</Body>}
      <Button title={saving ? copy.saving : copy.save} onPress={save} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  exercise: { gap: space.sm },
  set: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' },
  fill: { flex: 1 },
  remove: { paddingVertical: 14, paddingHorizontal: space.sm },
  error: { color: colors.redBright },
});
