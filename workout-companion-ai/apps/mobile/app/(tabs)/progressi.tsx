import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
import { colors, concentric, radius, shadow, spacing, sharedStyles, tabular, type } from '../../lib/theme';
import { showError } from '../../lib/utils';
import { getActiveCoachClient, getUserId } from '../../lib/queries';
import { ActivityRing } from '../../components/ActivityRing';
import { Card } from '../../components/Card';
import { MetricBlock } from '../../components/MetricBlock';
import { StatPill } from '../../components/StatPill';
import { BarChart, type BarDatum } from '../../components/BarChart';
import { EmptyState, LoadingState } from '../../components/States';
import { demoBiofeedback, demoPRs, demoStrengthPoints, demoWorkoutLogs, isDemo } from '../../lib/demo';

const RECORD_LABELS: Record<RecordType, string> = {
  max_load: 'Carico max',
  max_reps: 'Reps max',
  max_volume: 'Volume serie',
  estimated_1rm: '1RM stimato',
};

/**
 * Colore e icona dell'insight in base alla gravità: il colore non viaggia mai
 * da solo (ambra = attenzione, menta = fatto bene, ciano = informazione).
 */
const INSIGHT_TONE: Record<Insight['severity'], { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  warning: { color: colors.amber, icon: 'alert-circle' },
  positive: { color: colors.mint, icon: 'checkmark-circle' },
  info: { color: colors.cyan, icon: 'information-circle' },
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
      if (isDemo()) {
        const logs = demoWorkoutLogs(new Date());
        const buckets = weeklyActivity(logs, 8, new Date());
        setData({
          totalWorkouts: logs.length,
          totalVolumeKg: logs.reduce((a, l) => a + l.total_volume_kg, 0),
          streak: currentStreak(buckets),
          frequency: avgFrequencyPerWeek(buckets),
          avgWeight: 74.5,
          buckets,
          trendPct: volumeTrendPct(buckets),
          prs: demoPRs(),
          strength: { exerciseName: 'Squat con bilanciere', points: demoStrengthPoints() },
          insights: generateInsights({
            totalWorkouts: logs.length,
            trendPct: volumeTrendPct(buckets),
            countFirstHalfAvg: 2,
            countLateHalfAvg: 3,
            streak: currentStreak(buckets),
            recovery: [demoBiofeedback()],
            strengthDeltaPct: 8,
            strengthExerciseName: 'Squat con bilanciere',
            muscleVolume: [
              { group: 'quadricipiti', volumeKg: 12000 },
              { group: 'petto', volumeKg: 6000 },
              { group: 'dorso', volumeKg: 4000 },
            ],
            bestDay: 'Lunedì',
          }),
        });
        return;
      }

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
  const tonsLabel = tons.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  // L'anello dello streak si riempie sull'intera finestra osservata (8 settimane).
  const streakProgress = Math.min(1, data.streak / Math.max(1, data.buckets.length));
  const trendTone = data.trendPct == null ? colors.textSecondary : data.trendPct >= 0 ? colors.mint : colors.amber;

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
        <View style={styles.header}>
          <Text style={sharedStyles.screenTitle}>Progressi</Text>
          <Text style={[type.label, tabular]}>Ultime {data.buckets.length} settimane</Text>
        </View>

        {/* IL BLOCCO DOMINANTE: tutto il ferro spostato, con l'anello dello streak accanto.
            È l'unico faro della schermata (ambra = sforzo accumulato). */}
        <Card beacon={colors.amber} style={shadow.beacon(colors.amber)}>
          <MetricBlock
            value={tonsLabel}
            unit="t"
            label="Volume totale"
            caption="Il ferro che hai spostato finora."
            color={colors.amber}
            trailing={
              <View style={styles.streak}>
                <ActivityRing progress={streakProgress} color={colors.mint} size={96} strokeWidth={12}>
                  <Text style={styles.streakValue}>{data.streak}</Text>
                </ActivityRing>
                <Text style={styles.streakLabel} numberOfLines={2}>
                  Sett. di fila
                </Text>
              </View>
            }
          />
        </Card>

        {/* KPI di supporto: due righe pulite, un colore per ogni significato. */}
        <View style={styles.pillRow}>
          <StatPill label="Allenamenti" value={String(data.totalWorkouts)} color={colors.mint} />
          <StatPill label="Freq./sett." value={String(data.frequency)} />
        </View>
        <View style={styles.pillRow}>
          <StatPill
            label="Peso medio"
            value={data.avgWeight != null ? `${data.avgWeight} kg` : '—'}
            color={colors.cyan}
          />
          <StatPill label="Record" value={String(data.prs.length)} color={colors.rose} />
        </View>

        {data.insights.length > 0 ? (
          <Card>
            <View style={styles.cardHead}>
              <Ionicons name="sparkles" size={18} color={colors.violet} />
              <Text style={[type.label, styles.aiLabel]}>Insight per te</Text>
            </View>
            <View style={styles.insightList}>
              {data.insights.map((ins) => {
                const tone = INSIGHT_TONE[ins.severity];
                return (
                  <View key={ins.id} style={styles.insight}>
                    <Ionicons name={tone.icon} size={22} color={tone.color} style={styles.insightIcon} />
                    <View style={styles.insightBody}>
                      <Text style={[styles.insightTitle, { color: tone.color }]}>{ins.title}</Text>
                      <Text style={styles.insightText}>{ins.body}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        ) : null}

        <Card title="Volume settimanale">
          <BarChart data={volumeBars} color={colors.amber} height={152} />
          {data.trendPct != null ? (
            <View style={styles.delta}>
              <Ionicons
                name={data.trendPct >= 0 ? 'trending-up' : 'trending-down'}
                size={20}
                color={trendTone}
              />
              <Text style={styles.deltaText}>
                <Text style={[styles.deltaValue, tabular, { color: trendTone }]}>
                  {data.trendPct >= 0 ? '+' : ''}
                  {data.trendPct}%
                </Text>
                {" rispetto all'inizio del periodo"}
              </Text>
            </View>
          ) : null}
        </Card>

        <Card title="Attività settimanale">
          <Text style={styles.cardSub}>Allenamenti completati, settimana per settimana.</Text>
          <BarChart data={freqBars} color={colors.mint} height={112} />
        </Card>

        {data.strength ? (
          <Card title="Progressione forza">
            <Text style={styles.cardTitleStrong} numberOfLines={2}>
              {data.strength.exerciseName}
            </Text>
            <Text style={styles.cardSub}>1RM stimato per seduta (kg).</Text>
            <BarChart data={data.strength.points} color={colors.rose} />
          </Card>
        ) : null}

        <Card title="Record personali">
          {data.prs.length > 0 ? (
            <View style={styles.prList}>
              {data.prs.map((pr, i) => (
                <View key={pr.id} style={[styles.prRow, i === data.prs.length - 1 && styles.prRowLast]}>
                  <View style={styles.prBadge}>
                    <Ionicons name="trophy" size={18} color={colors.rose} />
                  </View>
                  <View style={styles.prInfo}>
                    <Text style={styles.prExercise} numberOfLines={1}>
                      {pr.exercise?.name ?? 'Esercizio'}
                    </Text>
                    <Text style={styles.prMeta} numberOfLines={1}>
                      {RECORD_LABELS[pr.record_type]} · {formatDay(pr.achieved_at)}
                    </Text>
                  </View>
                  <Text style={styles.prValue}>
                    {pr.record_type === 'max_reps' ? `${Math.round(pr.value)}` : `${pr.value} kg`}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>
              Nessun record ancora: continua così e cominceranno ad arrivare. 💪
            </Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Raggio interno delle superfici dentro una card (regola concentrica). */
const innerRadius = concentric(radius.lg, spacing.lg);

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
  streak: {
    width: 96,
    alignItems: 'center',
    gap: spacing.sm,
  },
  streakValue: {
    ...type.metricSm,
    ...tabular,
    fontSize: 30,
    lineHeight: 34,
    color: colors.mint,
  },
  streakLabel: {
    ...type.label,
    textAlign: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  aiLabel: {
    color: colors.violet,
  },
  cardSub: {
    ...sharedStyles.muted,
  },
  cardTitleStrong: {
    ...type.title,
  },
  insightList: {
    gap: spacing.sm,
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.raised,
    borderRadius: innerRadius,
    padding: spacing.lg,
  },
  insightIcon: {
    marginTop: 2,
  },
  insightBody: {
    flex: 1,
    gap: spacing.xs,
  },
  insightTitle: {
    ...type.body,
    fontWeight: '700',
  },
  insightText: {
    ...type.body,
    color: colors.textSecondary,
  },
  delta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.raised,
    borderRadius: innerRadius,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  deltaText: {
    ...sharedStyles.muted,
    flex: 1,
  },
  deltaValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  prList: {
    gap: 0,
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  prRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  prBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prInfo: {
    flex: 1,
    gap: 2,
  },
  prExercise: {
    ...type.body,
    fontWeight: '700',
  },
  prMeta: {
    ...sharedStyles.muted,
  },
  prValue: {
    ...tabular,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: colors.rose,
  },
  emptyText: {
    ...type.body,
    color: colors.textSecondary,
  },
});
