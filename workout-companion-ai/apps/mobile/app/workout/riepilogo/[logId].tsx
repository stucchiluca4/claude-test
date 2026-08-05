import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { recoveryPrediction, workoutKcal, workoutScore } from '@wc/shared';
import type { PersonalRecord, RecordType, WorkoutLog } from '@wc/shared';
import { supabase } from '../../../lib/supabase';
import { colors, concentric, radius, shadow, spacing, sharedStyles, tabular, type } from '../../../lib/theme';
import { localDateString, showError } from '../../../lib/utils';
import { getActiveCoachClient, getExerciseFeedbackForLog, getUserId } from '../../../lib/queries';
import { ActivityRing } from '../../../components/ActivityRing';
import { Card } from '../../../components/Card';
import { GlassSurface } from '../../../components/Glass';
import { MetricBlock } from '../../../components/MetricBlock';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { StatPill } from '../../../components/StatPill';
import { LoadingState } from '../../../components/States';

const RECORD_LABELS: Record<RecordType, string> = {
  max_load: 'Carico massimo',
  max_reps: 'Ripetizioni massime',
  max_volume: 'Miglior volume serie',
  estimated_1rm: '1RM stimato',
};

/** Veli dei segnali: colore al 12-14%, solo dietro le icone di sezione. */
const WASH = {
  mint: 'rgba(50,215,75,0.12)',
  rose: 'rgba(255,55,95,0.12)',
  cyan: 'rgba(100,210,255,0.12)',
  violet: 'rgba(191,90,242,0.14)',
} as const;

/** Ore massime della previsione di recupero: riempiono l'anello ciano. */
const RECOVERY_MAX_HOURS = 72;

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

/** Testata di sezione: icona del segnale + etichetta. Il colore non viaggia mai da solo. */
function SectionHead({
  icon,
  label,
  tint,
  wash,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint: string;
  wash: string;
}) {
  return (
    <View style={styles.head}>
      <View style={[styles.headIcon, { backgroundColor: wash }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={[type.label, styles.headLabel]}>{label}</Text>
    </View>
  );
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
  // Altezza della barra d'azione in vetro: il contenuto le scorre sotto senza finirci dietro.
  const [barH, setBarH] = useState(96);

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
    return <LoadingState message="Preparo il riepilogo…" />;
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

  const hasPr = data.prs.length > 0;
  // Il tono della celebrazione: rosa se hai battuto un record, menta se hai chiuso.
  const tone = hasPr ? colors.rose : colors.mint;

  return (
    <SafeAreaView style={sharedStyles.screen}>
      {/* FERRO: tutto ciò che si legge scorre qui sotto, opaco. */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: barH + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.doneChip}>
            <Ionicons name="checkmark-circle" size={17} color={colors.mint} />
            <Text style={styles.doneChipText}>Allenamento completato</Text>
          </View>
          <Text style={[sharedStyles.screenTitle, styles.heroTitle]}>{data.workoutName}</Text>
        </View>

        {/* IL FARO: il punteggio della seduta, letto in tre secondi dall'anello. */}
        <Card title="Punteggio seduta" beacon={tone} style={shadow.beacon(tone)}>
          <View style={styles.ringWrap}>
            <ActivityRing progress={score / 100} color={tone} size={212} strokeWidth={16}>
              <View style={styles.ringCore}>
                <Text style={[type.metric, tabular, { color: tone }]}>{score}</Text>
                <Text style={[type.label, styles.ringUnit]}>su 100</Text>
              </View>
            </ActivityRing>
          </View>

          {hasPr ? (
            <View style={styles.recordChip}>
              <Ionicons name="trophy" size={16} color={colors.rose} />
              <Text style={styles.recordChipText}>
                {data.prs.length === 1 ? '1 nuovo record personale' : `${data.prs.length} nuovi record personali`}
              </Text>
            </View>
          ) : null}

          <Text style={styles.heroCaption}>{scoreCaption}</Text>
        </Card>

        {/* I numeri di supporto: piccoli, tabulari, mai in gara col punteggio. */}
        <View style={styles.section}>
          <Text style={type.label}>I numeri della seduta</Text>
          <View style={styles.pillRow}>
            <StatPill label="Durata" value={`${durationMin}′`} />
            <StatPill label="Volume kg" value={Math.round(tonnage).toLocaleString('it-IT')} color={colors.amber} />
            <StatPill label="Serie" value={String(data.setsCount)} />
          </View>
          <View style={styles.pillRow}>
            <StatPill label="Ripetizioni" value={String(data.totalReps)} />
            <StatPill label="Kcal" value={String(kcal)} color={colors.amber} />
            <StatPill label="Esercizi" value={String(data.exercisesDone)} />
          </View>
        </View>

        <Card>
          <SectionHead
            icon="trophy"
            tint={colors.rose}
            wash={WASH.rose}
            label={hasPr ? `Nuovi record · ${data.prs.length}` : 'Record personali'}
          />
          {hasPr ? (
            data.prs.map((pr) => (
              <View key={pr.id} style={styles.prRow}>
                <View style={styles.prIcon}>
                  <Ionicons name="trophy" size={20} color={colors.rose} />
                </View>
                <View style={styles.prBody}>
                  <Text style={styles.prExercise} numberOfLines={1}>
                    {pr.exercise?.name ?? 'Esercizio'}
                  </Text>
                  <Text style={styles.prType} numberOfLines={1}>
                    {RECORD_LABELS[pr.record_type]}
                  </Text>
                </View>
                <Text style={[styles.prValue, tabular]}>
                  {pr.record_type === 'max_reps' ? `${Math.round(pr.value)} reps` : `${pr.value} kg`}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.note}>Nessun nuovo record oggi: la costanza vale più di tutto. 💪</Text>
          )}
        </Card>

        <Card>
          <SectionHead icon="battery-charging" tint={colors.cyan} wash={WASH.cyan} label="Recupero previsto" />
          <MetricBlock
            value={String(recovery.hours)}
            unit="ore"
            color={colors.cyan}
            trailing={
              <ActivityRing
                progress={recovery.hours / RECOVERY_MAX_HOURS}
                color={colors.cyan}
                size={84}
                strokeWidth={11}
              >
                <Ionicons name="moon" size={28} color={colors.cyan} />
              </ActivityRing>
            }
          />
          <Text style={styles.note}>{recovery.label}</Text>
        </Card>

        {/* Viola: se è viola, l'ha scritto il motore. Ma il testo resta su ferro. */}
        <Card>
          <SectionHead icon="sparkles" tint={colors.violet} wash={WASH.violet} label="Il recap del coach AI" />
          {aiLoading ? (
            <View style={styles.aiRow}>
              <ActivityIndicator color={colors.violet} />
              <Text style={[styles.note, styles.aiFlex]}>Sto analizzando la tua seduta…</Text>
            </View>
          ) : aiText ? (
            <Text style={styles.aiText}>{aiText}</Text>
          ) : aiFailed ? (
            <View style={styles.aiRow}>
              <Ionicons name="cloud-offline-outline" size={20} color={colors.textTertiary} />
              <Text style={[styles.note, styles.aiFlex]}>
                Recap AI non disponibile al momento (la funzione AI non è ancora attiva).
              </Text>
            </View>
          ) : null}
        </Card>
      </ScrollView>

      {/* VETRO: l'unica barra d'azione, sempre sotto il pollice. */}
      <View
        style={styles.barAnchor}
        pointerEvents="box-none"
        onLayout={(e) => setBarH(e.nativeEvent.layout.height)}
      >
        <GlassSurface cornerRadius={radius.xl} padding={spacing.md}>
          <PrimaryButton
            label="TORNA ALLA HOME"
            variant="success"
            onPress={() => router.replace('/(tabs)')}
          />
        </GlassSurface>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  doneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: WASH.mint,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  doneChipText: {
    color: colors.mint,
    fontSize: 15,
    fontWeight: '700',
  },
  heroTitle: {
    textAlign: 'center',
  },
  ringWrap: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  ringCore: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  ringUnit: {
    color: colors.textSecondary,
  },
  recordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.sm,
    backgroundColor: WASH.rose,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  recordChipText: {
    color: colors.rose,
    fontSize: 15,
    fontWeight: '700',
  },
  heroCaption: {
    color: colors.textSecondary,
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 25,
    textAlign: 'center',
  },
  section: {
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  headIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headLabel: {
    flex: 1,
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.raised,
    borderRadius: concentric(radius.lg, spacing.lg),
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  prIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.xs,
    backgroundColor: WASH.rose,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prBody: {
    flex: 1,
    gap: 2,
  },
  prExercise: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  prType: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  prValue: {
    color: colors.rose,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  note: {
    color: colors.textSecondary,
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 25,
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  aiFlex: {
    flex: 1,
  },
  aiText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 25,
  },
  barAnchor: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
  },
});
