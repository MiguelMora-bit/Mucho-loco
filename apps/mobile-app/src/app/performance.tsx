import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { HeatmapLevel } from '@mucho-loco/types';
import { formatDate, formatDuration } from '@mucho-loco/customer-core/dates';
import { formatKg } from '@mucho-loco/customer-core/workouts';
import { Body, Button, Card, Chip, Display, ErrorState, Heading, Loading, Mono, Screen } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { performanceRepository } from '@/lib/repositories';
import { useSessionStore } from '@/lib/stores/session.store';
import { useResource } from '@/lib/use-resource';
import { colors, space } from '@/theme';

type View_ = 'overview' | 'workouts' | 'heatmap';

const HEAT: Record<HeatmapLevel, string> = {
  '': colors.card2,
  l1: 'rgba(225,20,28,0.25)',
  l2: 'rgba(225,20,28,0.55)',
  l3: colors.red,
};

/** `PerformanceClient` de la web: resumen, entrenamientos y heatmap, en pestañas. */
export default function PerformanceScreen() {
  const { t, lang } = useT();
  const p = t.performance;
  const [view, setView] = useState<View_>('overview');
  const email = useSessionStore((s) => s.session?.email) ?? '';
  // La última columna es la semana en curso (spec 016): el scroll abre ahí.
  const heatmapScroll = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    const [stats, records, workouts, heatmap] = await Promise.all([
      performanceRepository.getStats(),
      performanceRepository.getPersonalRecords(),
      performanceRepository.getWorkouts(email),
      performanceRepository.getHeatmap(email),
    ]);
    return { stats, records, workouts, heatmap };
  }, [email]);
  const { state, reload } = useResource(load);
  const router = useRouter();

  // Al volver de registrar un entrenamiento, se relee (spec 017). El primer
  // foco coincide con el montaje, que ya está cargando.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      reload();
    }, [reload]),
  );

  // Borrar pide un segundo toque: un dedazo no se lleva un entrenamiento.
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);
  async function removeWorkout(id: string) {
    setDeleteFailed(false);
    try {
      await performanceRepository.deleteWorkout(email, id);
      setConfirming(null);
      reload();
    } catch {
      setDeleteFailed(true);
    }
  }

  return (
    <Screen safeTop={false}>
      <View>
        <Mono style={styles.orange}>{p.eyebrow}</Mono>
        <Display>{p.titleA}</Display>
        <Display style={styles.red}>{p.titleB}</Display>
      </View>
      <View style={styles.row}>
        {(['overview', 'workouts', 'heatmap'] as const).map((v) => (
          <Chip key={v} label={p.tabs[v]} active={view === v} onPress={() => setView(v)} />
        ))}
      </View>

      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && (
        <ErrorState message={t.common.connectionError} retryLabel={t.error.retry} onRetry={reload} />
      )}

      {state.status === 'ready' && view === 'overview' && (
        <>
          <View style={styles.grid}>
            {state.data.stats.map((s) => (
              <Card key={s.lbl.es} style={styles.stat}>
                <Mono>{s.lbl[lang]}</Mono>
                <Display style={[styles.statNum, { color: colors[s.color] ?? colors.cream }]}>{s.num}</Display>
                <Body style={styles.small}>{s.sub[lang]}</Body>
              </Card>
            ))}
          </View>
          <Heading>
            {p.overview.recordsPrefix} <Heading style={styles.red}>{p.overview.recordsHighlight}</Heading>{' '}
            {p.overview.recordsSuffix}
          </Heading>
          {state.data.records.map((pr) => (
            <Card key={pr.exercise.es} style={styles.record}>
              <Mono style={styles.orange}>🏆 PR</Mono>
              <Heading>{pr.exercise[lang]}</Heading>
              <Display style={[styles.statNum, styles.red]}>{pr.weight}</Display>
              <Mono>
                {formatDate(pr.date, lang, { day: '2-digit', month: 'short' })} ·{' '}
                <Mono style={styles.green}>{pr.delta}</Mono>
              </Mono>
            </Card>
          ))}
        </>
      )}

      {state.status === 'ready' && view === 'workouts' && (
        <>
          <Heading>
            {p.workouts.historyPrefix} <Heading style={styles.red}>{p.workouts.historyHighlight}</Heading>
          </Heading>
          <Button title={p.workouts.log} onPress={() => router.push('/workout/new')} />
          {state.data.workouts.length === 0 && <Body>{p.workouts.empty}</Body>}
          {deleteFailed && <Body style={styles.error}>{p.workouts.deleteError}</Body>}
          {state.data.workouts.map((w) => (
            <View key={w.id} style={styles.workout}>
              <View style={styles.date}>
                <Heading style={styles.red}>{formatDate(w.date, lang, { day: '2-digit' })}</Heading>
                <Mono>{formatDate(w.date, lang, { month: 'short' })}</Mono>
              </View>
              <View style={styles.fill}>
                <Body style={styles.cream}>{w.name}</Body>
                <Mono>
                  {w.setCount} {p.workouts.setsUnit} · {formatKg(w.volumeKg, lang)} {p.workouts.kgUnit} {p.workouts.volUnit}
                </Mono>
                {w.prs.map((pr) => (
                  <Mono key={pr.exercise} style={styles.green}>
                    🏆 {pr.exercise} · {formatKg(pr.weightKg, lang)} {p.workouts.kgUnit}
                  </Mono>
                ))}
                {confirming === w.id ? (
                  <Button title={p.workouts.confirmDelete} variant="outline" onPress={() => removeWorkout(w.id)} />
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${p.workouts.delete}: ${w.name}`}
                    onPress={() => setConfirming(w.id)}
                  >
                    <Mono style={styles.muted}>{p.workouts.delete}</Mono>
                  </Pressable>
                )}
              </View>
              <Mono style={styles.orange}>{formatDuration(w.durationMinutes, lang)}</Mono>
            </View>
          ))}
        </>
      )}

      {state.status === 'ready' && view === 'heatmap' && (
        <Card>
          <Heading>
            {p.heatmap.titlePrefix} <Heading style={styles.red}>{p.heatmap.titleHighlight}</Heading>
          </Heading>
          <Body style={styles.small}>{p.heatmap.caption}</Body>
          {/* 52 semanas no caben en un teléfono: una columna por semana, con scroll horizontal. */}
          <ScrollView
            ref={heatmapScroll}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.heatmap}
            onContentSizeChange={() => heatmapScroll.current?.scrollToEnd({ animated: false })}
          >
            {state.data.heatmap.map((week, wi) => (
              <View key={wi} style={styles.week}>
                {week.map((day, di) => (
                  <View
                    key={di}
                    accessibilityLabel={day ? p.heatmap.trained : p.heatmap.noRecord}
                    style={[styles.cell, { backgroundColor: HEAT[day] }]}
                  />
                ))}
              </View>
            ))}
          </ScrollView>
          <View style={styles.legend}>
            <Mono>{p.heatmap.less}</Mono>
            {(['', 'l1', 'l2', 'l3'] as const).map((l) => (
              <View key={l || 'none'} style={[styles.cell, { backgroundColor: HEAT[l] }]} />
            ))}
            <Mono>{p.heatmap.more}</Mono>
          </View>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  red: { color: colors.red },
  orange: { color: colors.orange },
  green: { color: colors.green },
  muted: { color: colors.muted },
  error: { color: colors.redBright },
  cream: { color: colors.cream },
  small: { fontSize: 12, lineHeight: 16 },
  fill: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stat: { width: '48%', flexGrow: 1 },
  statNum: { fontSize: 36, lineHeight: 40 },
  record: { borderLeftWidth: 3, borderLeftColor: colors.red },
  workout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: space.sm,
  },
  date: { width: 44, alignItems: 'center' },
  heatmap: { gap: 3, paddingVertical: space.sm },
  week: { gap: 3 },
  cell: { width: 12, height: 12, borderRadius: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
