import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { recoveryPrediction, workoutKcal, workoutScore } from '@wc/shared';
import type { PersonalRecord, RecordType, WorkoutLog } from '@wc/shared';
import { supabase } from '../../../lib/supabase';
import { colors, radius, spacing, sharedStyles } from '../../../lib/theme';
import { localDateString, showError } from '../../../lib/utils';
import { getActiveCoachClient, getExerciseFeedbackForLog, getUserId } from '../../../lib/queries';
import { Card } from '../../../components/Card';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { StatPill } from '../../../components/StatPill';

const RECORD_LABELS: Record<RecordType, string> = {
  max_load: 'Carico massimo',
  max_reps: 'Ripetizioni massime',
  max_volume: 'Miglior volume serie',
  estimated_1rm: '1RM stimato',
};

interface SummaryData {
  log: WorkoutLog;
  workoutName: string;
  coachClientId: string | null;
  setsCount: number;
  totalReps: number;
  exercisesDone: number;
  prescribedSets: number | null;
  avgRpe: number | null;
  maxPain: number | null;
  prs: PersonalRecord[];
  volumeRatio: number | null;
  weightKg: number | null;
}

function throwIf(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

/**
 * Riepilogo di fine allenamento: punteggio, numeri chiave, record personali,
 * previsione di recupero e recap del coach AI.
 */
export default function WorkoutSummaryScreen() {
  const { logId } = useLocalSearchParams<{ logId: string }>();
  const router = useRouter();
  const [data, setData] = useState<SummaryData | null>(null);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFailed, setAiFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!logId) return;
      try {
        const uid = await getUserId();
        if (!uid) throw new Error('Sessione scaduta, effettua di nuovo l’accesso.');

        const { data: logRow, error: logError } = await supabase
          .from('workout_logs')
          .select('*, program_workout:program_workouts(name)')
          .eq('id', logId)
          .maybeSingle();
        throwIf(logError);
        if (!logRow) throw new Error('Seduta non trovata.');
        const log = logRow as WorkoutLog & { program_workout: { name: string } | null };

        const { data: sets, error: setsError } = await supabase
          .from('set_logs')
          .select('exercise_id, load_kg, reps, rpe')
          .eq('workout_log_id', logId)
          .eq('completed', true);
        throwIf(setsError);
        const setRows = (sets ?? []) as { exercise_id: string; load_kg: number | null; reps: number | null; rpe: number | null }[];

        const feedbacks = await getExerciseFeedbackForLog(logId);

        // Serie prescritte (per il tasso di completamento del punteggio).
        let prescribedSets: number | null = null;
        if (log.program_workout_id) {
          const { data: pw, error: pwError } = await supabase
            .from('program_workouts')
            .select('workout_exercises(exercise_sets(id))')
            .eq('id', log.program_workout_id)
            .maybeSingle();
          throwIf(pwError);
          const wes = (pw as { workout_exercises?: { exercise_sets?: { id: string }[] }[] } | null)?.workout_exercises ?? [];
          prescribedSets = wes.reduce((acc, we) => acc + (we.exercise_sets?.length ?? 0), 0);
        }

        // Volume della stessa seduta precedente (per il trend del punteggio).
        let volumeRatio: number | null = null;
        if (log.program_workout_id && log.total_volume_kg) {
          const { data: prev, error: prevError } = await supabase
            .from('workout_logs')
            .select('total_volume_kg')
            .eq('program_workout_id', log.program_workout_id)
            .eq('client_id', uid)
            .not('completed_at', 'is', null)
            .neq('id', logId)
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          throwIf(prevError);
          const prevVol = (prev as { total_volume_kg: number | null } | null)?.total_volume_kg;
          if (prevVol && Number(prevVol) > 0) volumeRatio = Number(log.total_volume_kg) / Number(prevVol);
        }

        // Record personali stabiliti oggi sugli esercizi della seduta.
        const exerciseIds = [...new Set(setRows.map((s) => s.exercise_id))];
        let prs: PersonalRecord[] = [];
        if (exerciseIds.length > 0) {
          const { data: prRows, error: prError } = await supabase
            .from('personal_records')
            .select('*, exercise:exercises(name)')
            .eq('client_id', uid)
            .eq('achieved_at', localDateString(new Date()))
            .in('exercise_id', exerciseIds);
          throwIf(prError);
          prs = (prRows ?? []) as PersonalRecord[];
        }

        // Peso più recente (per la stima kcal).
        const cc = await getActiveCoachClient(uid);
        let weightKg: number | null = null;
        if (cc) {
          const { data: w, error: wError } = await supabase
            .from('daily_biofeedback')
            .select('weight_kg')
            .eq('coach_client_id', cc.id)
            .not('weight_kg', 'is', null)
            .order('log_date', { ascending: false })
            .limit(1)
            .maybeSingle();
          throwIf(wError);
          weightKg = (w as { weight_kg: number | null } | null)?.weight_kg ?? null;
        }

        const rpeValues = setRows.map((s) => s.rpe).filter((v): v is number => v != null);
        const fbRpe = feedbacks.map((f) => f.rpe).filter((v): v is number => v != null);
        const avgSource = rpeValues.length > 0 ? rpeValues : fbRpe;
        const avgRpe = avgSource.length > 0 ? avgSource.reduce((a, b) => a + b, 0) / avgSource.length : null;
        const painValues = feedbacks.map((f) => f.pain).filter((v): v is number => v != null);
        const maxPain = painValues.length > 0 ? Math.max(...painValues) : null;

        if (cancelled) return;
        setData({
          log,
          workoutName: log.program_workout?.name ?? 'Allenamento libero',
          coachClientId: cc?.id ?? null,
          setsCount: setRows.length,
          totalReps: setRows.reduce((acc, s) => acc + (s.reps ?? 0), 0),
          exercisesDone: exerciseIds.length,
          prescribedSets,
          avgRpe,
          maxPain,
          prs,
          volumeRatio,
          weightKg,
        });
      } catch (e) {
        if (!cancelled) {
          showError(e, 'Impossibile caricare il riepilogo');
          router.replace('/(tabs)');
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [logId, router]);

  // Recap AI: best-effort, il riepilogo funziona anche senza.
  useEffect(() => {
    if (!data) return;
    let cancelled = false;

    (async () => {
      try {
        setAiLoading(true);
        const { data: res, error } = await supabase.functions.invoke('ai-coach', {
          body: {
            scope: 'workout_recap',
            workoutLogId: data.log.id,
            coachClientId: data.coachClientId,
          },
        });
        if (error) throw error;
        const answer = (res as { answer?: string } | null)?.answer;
        if (!cancelled) {
          setAiText(answer ?? null);
          setAiFailed(!answer);
        }
      } catch {
        if (!cancelled) setAiFailed(true);
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data]);

  if (!data) {
    return (
      <SafeAreaView style={sharedStyles.screen}>
        <View style={sharedStyles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={sharedStyles.muted}>Preparo il riepilogo…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tonnage = Number(data.log.total_volume_kg ?? 0);
  const durationMin = data.log.duration_min ?? 0;
  const completionRate =
    data.prescribedSets && data.prescribedSets > 0 ? data.setsCount / data.prescribedSets : 1;
  const score = workoutScore({
    completionRate,
    prCount: data.prs.length,
    volumeRatio: data.volumeRatio,
  });
  const kcal = workoutKcal(durationMin, data.weightKg ?? 75);
  const recovery = recoveryPrediction({
    avgRpe: data.avgRpe,
    maxPain: data.maxPain,
    tonnageKg: tonnage,
  });

  const scoreCaption =
    data.volumeRatio != null
      ? `Volume ${data.volumeRatio >= 1 ? '+' : ''}${Math.round((data.volumeRatio - 1) * 100)}% rispetto alla volta scorsa`
      : 'Prima volta con questa seduta: hai fissato il punto di partenza.';

  return (
    <SafeAreaView style={sharedStyles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={sharedStyles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🎉</Text>
          <Text style={sharedStyles.screenTitle}>Allenamento completato</Text>
          <Text style={sharedStyles.muted}>{data.workoutName}</Text>
        </View>

        <Card title="Punteggio seduta">
          <View style={styles.scoreRow}>
            <Text style={sharedStyles.bigNumber}>{score}</Text>
            <Text style={styles.scoreUnit}>/100</Text>
          </View>
          <Text style={sharedStyles.muted}>{scoreCaption}</Text>
        </Card>

        <View style={styles.pillRow}>
          <StatPill label="Durata" value={`${durationMin}′`} />
          <StatPill label="Volume" value={`${Math.round(tonnage)} kg`} color={colors.accent} />
          <StatPill label="Serie" value={String(data.setsCount)} />
        </View>
        <View style={styles.pillRow}>
          <StatPill label="Ripetizioni" value={String(data.totalReps)} />
          <StatPill label="Kcal stimate" value={String(kcal)} color={colors.warning} />
          <StatPill label="Esercizi" value={String(data.exercisesDone)} />
        </View>

        <Card title={data.prs.length > 0 ? `🏆 Nuovi record (${data.prs.length})` : '🏆 Record personali'}>
          {data.prs.length > 0 ? (
            data.prs.map((pr) => (
              <View key={pr.id} style={styles.prRow}>
                <Text style={styles.prExercise} numberOfLines={1}>
                  {pr.exercise?.name ?? 'Esercizio'}
                </Text>
                <Text style={styles.prValue}>
                  {RECORD_LABELS[pr.record_type]}:{' '}
                  {pr.record_type === 'max_reps' ? `${Math.round(pr.value)} reps` : `${pr.value} kg`}
                </Text>
              </View>
            ))
          ) : (
            <Text style={sharedStyles.muted}>
              Nessun nuovo record oggi: la costanza vale più di tutto. 💪
            </Text>
          )}
        </Card>

        <Card title="🔋 Recupero previsto">
          <View style={styles.scoreRow}>
            <Text style={styles.recoveryHours}>{recovery.hours}</Text>
            <Text style={styles.scoreUnit}>ore</Text>
          </View>
          <Text style={sharedStyles.muted}>{recovery.label}</Text>
        </Card>

        <Card title="🤖 Il recap del coach AI">
          {aiLoading ? (
            <View style={styles.aiLoading}>
              <ActivityIndicator color={colors.accent} />
              <Text style={sharedStyles.muted}>Sto analizzando la tua seduta…</Text>
            </View>
          ) : aiText ? (
            <Text style={sharedStyles.body}>{aiText}</Text>
          ) : aiFailed ? (
            <Text style={sharedStyles.muted}>
              Recap AI non disponibile al momento (la funzione AI non è ancora attiva).
            </Text>
          ) : null}
        </Card>

        <PrimaryButton
          label="TORNA ALLA HOME"
          variant="success"
          onPress={() => router.replace('/(tabs)')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
  heroEmoji: {
    fontSize: 44,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  scoreUnit: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  recoveryHours: {
    color: colors.textPrimary,
    fontSize: 34,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  prRow: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: 2,
  },
  prExercise: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  prValue: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  aiLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
