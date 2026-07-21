import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  avgFrequencyPerWeek,
  currentStreak,
  DAYS_OF_WEEK,
  estimate1RM,
  generateInsights,
  setVolume,
  volumeTrendPct,
  weeklyActivity,
  type Insight,
  type PersonalRecord,
  type RecordType,
  type WeekBucket,
} from '@wc/shared';
import { supabase } from '../../lib/supabase';
import { colors, spacing, sharedStyles } from '../../lib/theme';
import { showError } from '../../lib/utils';
import { getActiveCoachClient, getUserId } from '../../lib/queries';
import { Card } from '../../components/Card';
import { StatPill } from '../../components/StatPill';
import { BarChart, type BarDatum } from '../../components/BarChart';
import { EmptyState, LoadingState } from '../../components/States';

const RECORD_LABELS: Record<RecordType, string> = {
  max_load: 'Carico max',
  max_reps: 'Reps max',
  max_volume: 'Volume serie',
  estimated_1rm: '1RM stimato',
};

interface StrengthSeries {
  exerciseName: string;
  points: BarDatum[];
}

interface Analytics {
  totalWorkouts: number;
  totalVolumeKg: number;
  streak: number;
  frequency: number;
  avgWeight: number | null;
  buckets: WeekBucket[];
  trendPct: number | null;
  prs: PersonalRecord[];
  strength: StrengthSeries | null;
  insights: Insight[];
}

function throwIf(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

/** Colore del bordo/titolo insight in base alla gravità. */
function insightColor(severity: Insight['severity']): string {
  if (severity === 'warning') return colors.warning;
  if (severity === 'positive') return colors.accent;
  return colors.celeste;
}

/** Data "solo giorno" (YYYY-MM-DD) formattata in it-IT senza sfasamenti di fuso. */
function formatDay(iso: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ProgressiScreen() {
  const [data, setData] = useState<Analytics | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const uid = await getUserId();
      if (!uid) return;

      const { data: logsData, error: logsError } = await supabase
        .from('workout_logs')
        .select('id, started_at, total_volume_kg')
        .eq('client_id', uid)
        .not('completed_at', 'is', null)
        .order('started_at', { ascending: false });
      throwIf(logsError);
      const logs = (logsData ?? []) as { id: string; started_at: string; total_volume_kg: number | null }[];

      const totalVolumeKg = logs.reduce((acc, l) => acc + Number(l.total_volume_kg ?? 0), 0);
      const buckets = weeklyActivity(logs, 8, new Date());

      // Record personali recenti.
      const { data: prData, error: prError } = await supabase
        .from('personal_records')
        .select('*, exercise:exercises(name)')
        .eq('client_id', uid)
        .order('achieved_at', { ascending: false })
        .limit(12);
      throwIf(prError);
      const prs = (prData ?? []) as PersonalRecord[];

      // Peso medio recente (biofeedback se collegato a un coach, altrimenti check-in).
      const cc = await getActiveCoachClient(uid);
      let avgWeight: number | null = null;
      if (cc) {
        const { data: w } = await supabase
          .from('daily_biofeedback')
          .select('weight_kg')
          .eq('coach_client_id', cc.id)
          .not('weight_kg', 'is', null)
          .order('log_date', { ascending: false })
          .limit(10);
        const vals = ((w ?? []) as { weight_kg: number }[]).map((r) => Number(r.weight_kg));
        if (vals.length > 0) avgWeight = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
      }

      // Recupero recente (per gli insight sul sovrallenamento).
      let recovery: { recovery: number | null; muscle_soreness: number | null; sleep_quality: number | null }[] = [];
      if (cc) {
        const { data: rec } = await supabase
          .from('daily_biofeedback')
          .select('recovery, muscle_soreness, sleep_quality')
          .eq('coach_client_id', cc.id)
          .order('log_date', { ascending: false })
          .limit(6);
        recovery = (rec ?? []) as typeof recovery;
      }

      // Progressione forza + volume per gruppo muscolare (dalle serie recenti).
      let strength: StrengthSeries | null = null;
      let strengthDeltaPct: number | null = null;
      let strengthExerciseName: string | null = null;
      const muscleMap = new Map<string, number>();
      const recentLogIds = logs.slice(0, 20).map((l) => l.id);
      const dateByLog = new Map(logs.map((l) => [l.id, l.started_at]));
      if (recentLogIds.length > 0) {
        const { data: setData2, error: setError } = await supabase
          .from('set_logs')
          .select('workout_log_id, exercise_id, load_kg, reps, exercise:exercises(name, muscle_group)')
          .in('workout_log_id', recentLogIds)
          .eq('completed', true);
        throwIf(setError);
        const rows = (setData2 ?? []) as unknown as {
          workout_log_id: string;
          exercise_id: string;
          load_kg: number | null;
          reps: number | null;
          exercise: { name: string; muscle_group: string | null } | null;
        }[];

        const byExercise = new Map<string, { name: string; bestByLog: Map<string, number> }>();
        for (const s of rows) {
          if (s.load_kg == null || s.reps == null) continue;
          const group = s.exercise?.muscle_group;
          if (group) muscleMap.set(group, (muscleMap.get(group) ?? 0) + setVolume(Number(s.load_kg), Number(s.reps)));
          const e1 = estimate1RM(Number(s.load_kg), Math.round(Number(s.reps)));
          if (!(e1 > 0)) continue;
          const rec = byExercise.get(s.exercise_id) ?? { name: s.exercise?.name ?? 'Esercizio', bestByLog: new Map() };
          const prev = rec.bestByLog.get(s.workout_log_id);
          if (prev == null || e1 > prev) rec.bestByLog.set(s.workout_log_id, e1);
          byExercise.set(s.exercise_id, rec);
        }

        let top: { name: string; bestByLog: Map<string, number> } | null = null;
        for (const rec of byExercise.values()) {
          if (!top || rec.bestByLog.size > top.bestByLog.size) top = rec;
        }
        if (top && top.bestByLog.size >= 2) {
          const points = [...top.bestByLog.entries()]
            .map(([logId, e1]) => ({ date: dateByLog.get(logId) ?? '', e1 }))
            .filter((p) => p.date)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(-8)
            .map((p) => {
              const d = new Date(p.date);
              return { label: `${d.getDate()}/${d.getMonth() + 1}`, value: Math.round(p.e1), display: `${Math.round(p.e1)}` };
            });
          strength = { exerciseName: top.name, points };
          strengthExerciseName = top.name;
          const first = points[0]?.value;
          const last = points[points.length - 1]?.value;
          if (first && first > 0 && last != null) strengthDeltaPct = Math.round(((last - first) / first) * 100);
        }
      }

      // Giorno della settimana col volume medio più alto.
      const dayVolume = new Array(7).fill(0) as number[];
      for (const l of logs) {
        const idx = (new Date(l.started_at).getDay() + 6) % 7; // 0 = lunedì
        dayVolume[idx] += Number(l.total_volume_kg ?? 0);
      }
      const bestIdx = dayVolume.indexOf(Math.max(...dayVolume));
      const bestDay = dayVolume[bestIdx] > 0 ? DAYS_OF_WEEK[bestIdx] : null;

      // Media allenamenti/settimana prima e seconda metà del periodo.
      const halfAvg = (arr: WeekBucket[]) =>
        arr.length ? Math.round((arr.reduce((a, b) => a + b.count, 0) / arr.length) * 10) / 10 : 0;
      const trendPct = volumeTrendPct(buckets);
      const streak = currentStreak(buckets);

      const insights = generateInsights({
        totalWorkouts: logs.length,
        trendPct,
        countFirstHalfAvg: halfAvg(buckets.slice(0, 4)),
        countLateHalfAvg: halfAvg(buckets.slice(4)),
        streak,
        recovery,
        strengthDeltaPct,
        strengthExerciseName,
        muscleVolume: [...muscleMap.entries()].map(([group, volumeKg]) => ({ group, volumeKg })),
        bestDay,
      });

      setData({
        totalWorkouts: logs.length,
        totalVolumeKg,
        streak,
        frequency: avgFrequencyPerWeek(buckets),
        avgWeight,
        buckets,
        trendPct,
        prs,
        strength,
        insights,
      });
    } catch (e) {
      showError(e, 'Errore di caricamento');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (!data) return <LoadingState message="Calcolo i tuoi progressi…" />;

  if (data.totalWorkouts === 0) {
    return (
      <SafeAreaView style={sharedStyles.screen} edges={['top']}>
        <ScrollView
          contentContainerStyle={sharedStyles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
          <Text style={sharedStyles.screenTitle}>Progressi</Text>
          <EmptyState
            emoji="📈"
            title="Ancora nessun dato"
            message="Completa il tuo primo allenamento e qui vedrai volume, record, streak e la progressione della forza. Tira su un po' di ferro! 💪"
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const tons = Math.round(data.totalVolumeKg / 100) / 10;
  const volumeBars: BarDatum[] = data.buckets.map((b) => ({
    label: b.label,
    value: Math.round(b.volumeKg),
    display: b.volumeKg >= 1000 ? `${Math.round(b.volumeKg / 100) / 10}t` : `${Math.round(b.volumeKg)}`,
  }));
  const freqBars: BarDatum[] = data.buckets.map((b) => ({ label: b.label, value: b.count }));

  return (
    <SafeAreaView style={sharedStyles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={sharedStyles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <Text style={sharedStyles.screenTitle}>Progressi</Text>

        <View style={styles.pillRow}>
          <StatPill label="Allenamenti" value={String(data.totalWorkouts)} color={colors.accent} />
          <StatPill label="Streak (sett.)" value={`${data.streak}🔥`} />
          <StatPill label="Freq./sett." value={String(data.frequency)} />
        </View>
        <View style={styles.pillRow}>
          <StatPill label="Tonnellate" value={String(tons)} color={colors.success} />
          <StatPill label="Peso medio" value={data.avgWeight != null ? `${data.avgWeight} kg` : '—'} />
        </View>

        {data.insights.length > 0 ? (
          <Card title="🧠 Insight per te">
            {data.insights.map((ins) => (
              <View key={ins.id} style={[styles.insight, { borderLeftColor: insightColor(ins.severity) }]}>
                <Text style={[styles.insightTitle, { color: insightColor(ins.severity) }]}>{ins.title}</Text>
                <Text style={sharedStyles.body}>{ins.body}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        <Card title="Volume settimanale (8 settimane)">
          <BarChart data={volumeBars} />
          {data.trendPct != null ? (
            <Text style={[sharedStyles.muted, { marginTop: spacing.sm }]}>
              Andamento volume: {data.trendPct >= 0 ? '▲ +' : '▼ '}
              {data.trendPct}% rispetto all'inizio del periodo.
            </Text>
          ) : null}
        </Card>

        <Card title="Attività settimanale (allenamenti)">
          <BarChart data={freqBars} color={colors.avio} />
        </Card>

        {data.strength ? (
          <Card title={`Progressione forza · ${data.strength.exerciseName}`}>
            <Text style={[sharedStyles.muted, { marginBottom: spacing.sm }]}>1RM stimato per seduta (kg)</Text>
            <BarChart data={data.strength.points} color={colors.celeste} />
          </Card>
        ) : null}

        <Card title={data.prs.length > 0 ? `🏆 Record personali (${data.prs.length})` : '🏆 Record personali'}>
          {data.prs.length > 0 ? (
            data.prs.map((pr) => (
              <View key={pr.id} style={styles.prRow}>
                <View style={styles.prInfo}>
                  <Text style={styles.prExercise} numberOfLines={1}>
                    {pr.exercise?.name ?? 'Esercizio'}
                  </Text>
                  <Text style={sharedStyles.muted}>
                    {RECORD_LABELS[pr.record_type]} · {formatDay(pr.achieved_at)}
                  </Text>
                </View>
                <Text style={styles.prValue}>
                  {pr.record_type === 'max_reps' ? `${Math.round(pr.value)}` : `${pr.value} kg`}
                </Text>
              </View>
            ))
          ) : (
            <Text style={sharedStyles.muted}>
              Nessun record ancora: continua così e cominceranno ad arrivare. 💪
            </Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  insight: {
    borderLeftWidth: 3,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
    marginBottom: spacing.md,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  prInfo: {
    flex: 1,
    gap: 2,
  },
  prExercise: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  prValue: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
