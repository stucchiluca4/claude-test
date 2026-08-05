import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DAYS_OF_WEEK, readinessFromBiofeedback } from '@wc/shared';
import type { CoachClient, NutritionDay, ProgramWorkout, Readiness } from '@wc/shared';
import { supabase } from '../../lib/supabase';
import { colors, concentric, radius, shadow, spacing, sharedStyles, tabular, type } from '../../lib/theme';
import {
  localDateString,
  mondayOfCurrentWeek,
  parseNum,
  showError,
  startOfTodayIso,
  todayDayOfWeek,
} from '../../lib/utils';
import {
  currentWeekNumber,
  getActiveCoachClient,
  getActiveProgram,
  getBiofeedbackByDate,
  getTodayNutritionDay,
  getUserId,
  getWeekWorkouts,
  upsertDailyBiofeedback,
  type DailyBiofeedback,
} from '../../lib/queries';
import { ActivityRing } from '../../components/ActivityRing';
import { Card } from '../../components/Card';
import { MetricBlock } from '../../components/MetricBlock';
import { Press } from '../../components/Press';
import { PrimaryButton } from '../../components/PrimaryButton';
import { StatPill } from '../../components/StatPill';
import { EmptyState, LoadingState } from '../../components/States';
import { demoBiofeedback, demoWorkout, isDemo } from '../../lib/demo';

interface HomeData {
  firstName: string;
  coachClient: CoachClient | null;
  todayWorkout: ProgramWorkout | null;
  todayWorkoutDone: boolean;
  nutritionDay: NutritionDay | null;
  latestWeight: number | null;
  checkinDue: boolean;
  todayBiofeedback: DailyBiofeedback | null;
}

/** Colore segnale della prontezza: menta alta, ambra media, rosa bassa. */
const READINESS_TONE: Record<Readiness, string> = {
  go_hard: colors.mint,
  normal: colors.mint,
  easy: colors.amber,
  rest: colors.rose,
};

/** Icona dentro l'anello: il colore non viaggia mai da solo. */
const READINESS_ICON: Record<Readiness, keyof typeof Ionicons.glyphMap> = {
  go_hard: 'flash',
  normal: 'thumbs-up',
  easy: 'leaf',
  rest: 'bed',
};

/**
 * Punteggio 1-10 della prontezza: la stessa media che il motore condiviso usa
 * per scegliere il livello (recupero e sonno diretti, dolori e stress invertiti).
 * Serve solo a riempire l'anello e a mostrare il numero: la lettura resta quella
 * di `readinessFromBiofeedback`.
 */
function readinessScore(b: DailyBiofeedback | null): number | null {
  if (!b) return null;
  const values = [
    b.recovery,
    b.sleep_quality,
    b.muscle_soreness != null ? 11 - b.muscle_soreness : null,
    b.stress_level != null ? 11 - b.stress_level : null,
  ].filter((v): v is number => v != null && Number.isFinite(v));
  if (values.length === 0) return null;
  return values.reduce((a, v) => a + v, 0) / values.length;
}

export default function HomeScreen() {
  const [data, setData] = useState<HomeData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [quickForm, setQuickForm] = useState<'peso' | 'nota' | null>(null);
  const [quickValue, setQuickValue] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      if (isDemo()) {
        const bf = demoBiofeedback();
        setData({
          firstName: 'Atleta',
          coachClient: {
            id: 'demo-cc',
            coach_id: 'demo-coach',
            client_id: 'demo-athlete',
            status: 'active',
            invite_email: null,
            started_at: null,
            created_at: new Date().toISOString(),
          },
          todayWorkout: demoWorkout(),
          todayWorkoutDone: false,
          nutritionDay: {
            id: 'demo-nd',
            nutrition_plan_id: 'demo',
            week_number: 1,
            day_of_week: 1,
            day_type: 'training',
            kcal: 2400,
            protein_g: 180,
            carbs_g: 250,
            fat_g: 70,
          },
          latestWeight: bf.weight_kg,
          checkinDue: false,
          todayBiofeedback: {
            id: 'demo-bf',
            coach_client_id: 'demo-cc',
            log_date: localDateString(new Date()),
            sleep_quality: bf.sleep_quality,
            sleep_hours: bf.sleep_hours,
            stress_level: bf.stress_level,
            energy_level: 7,
            muscle_soreness: bf.muscle_soreness,
            joint_stress: 2,
            recovery: bf.recovery,
            carbs_g: null,
            protein_g: null,
            fat_g: null,
            kcal_consumed: null,
            hydration_l: null,
            steps: bf.steps,
            weight_kg: bf.weight_kg,
            notes: null,
          },
        });
        return;
      }

      const uid = await getUserId();
      if (!uid) return;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', uid)
        .maybeSingle();
      if (profileError) throw new Error(profileError.message);

      const next: HomeData = {
        firstName: (profile as { first_name: string | null } | null)?.first_name ?? '',
        coachClient: null,
        todayWorkout: null,
        todayWorkoutDone: false,
        nutritionDay: null,
        latestWeight: null,
        checkinDue: false,
        todayBiofeedback: null,
      };

      const cc = await getActiveCoachClient(uid);
      next.coachClient = cc;

      if (cc) {
        const program = await getActiveProgram(cc.id);
        if (program) {
          const workouts = await getWeekWorkouts(program.id, currentWeekNumber(program));
          next.todayWorkout = workouts.find((w) => w.day_of_week === todayDayOfWeek()) ?? null;
          if (next.todayWorkout) {
            const { data: logs, error: logsError } = await supabase
              .from('workout_logs')
              .select('id')
              .eq('program_workout_id', next.todayWorkout.id)
              .eq('client_id', uid)
              .not('completed_at', 'is', null)
              .gte('started_at', startOfTodayIso())
              .limit(1);
            if (logsError) throw new Error(logsError.message);
            next.todayWorkoutDone = (logs ?? []).length > 0;
          }
        }

        next.nutritionDay = await getTodayNutritionDay(cc.id);

        const { data: weights, error: weightsError } = await supabase
          .from('checkins')
          .select('weight_kg')
          .eq('coach_client_id', cc.id)
          .not('weight_kg', 'is', null)
          .order('week_start', { ascending: false })
          .limit(1);
        if (weightsError) throw new Error(weightsError.message);
        next.latestWeight = (weights?.[0] as { weight_kg: number } | undefined)?.weight_kg ?? null;

        const { data: checkin, error: checkinError } = await supabase
          .from('checkins')
          .select('id, status')
          .eq('coach_client_id', cc.id)
          .eq('week_start', mondayOfCurrentWeek())
          .maybeSingle();
        if (checkinError) throw new Error(checkinError.message);
        const status = (checkin as { status: string } | null)?.status;
        next.checkinDue = !checkin || status === 'pending';

        next.todayBiofeedback = await getBiofeedbackByDate(cc.id, localDateString(new Date()));
      }

      setData(next);
    } catch (e) {
      showError(e, 'Errore di caricamento');
    }
  }, []);

  // Ricarica a ogni ritorno sulla Home (es. dopo aver completato un allenamento).
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

  /** Apre/chiude i mini-form di "Aggiungi velocemente", pre-compilando il valore odierno. */
  function toggleQuickForm(kind: 'peso' | 'nota') {
    if (quickForm === kind) {
      setQuickForm(null);
      return;
    }
    const bf = data?.todayBiofeedback;
    setQuickValue(
      kind === 'peso' ? (bf?.weight_kg != null ? String(bf.weight_kg) : '') : (bf?.notes ?? ''),
    );
    setQuickForm(kind);
  }

  async function saveQuick() {
    const cc = data?.coachClient;
    if (!cc || !quickForm) return;
    if (isDemo()) {
      Alert.alert('Modalità demo', 'Qui i dati non vengono salvati: è solo una prova.');
      setQuickForm(null);
      return;
    }
    const isWeight = quickForm === 'peso';
    const weightKg = isWeight ? parseNum(quickValue) : null;
    if (isWeight && weightKg == null) {
      Alert.alert('Peso non valido', 'Inserisci il peso in kg, ad esempio 72,5.');
      return;
    }
    setQuickSaving(true);
    try {
      await upsertDailyBiofeedback({
        coach_client_id: cc.id,
        log_date: localDateString(new Date()),
        ...(isWeight ? { weight_kg: weightKg } : { notes: quickValue.trim() || null }),
      });
      setQuickForm(null);
      setQuickValue('');
      await load();
    } catch (e) {
      showError(e, 'Salvataggio non riuscito');
    } finally {
      setQuickSaving(false);
    }
  }

  if (!data) {
    return <LoadingState message="Carico la tua giornata…" />;
  }

  const today = new Date();
  const dateLabel = `${DAYS_OF_WEEK[todayDayOfWeek() - 1]} ${today.getDate()}/${today.getMonth() + 1}`;
  const readiness = readinessFromBiofeedback(data.todayBiofeedback);
  const score = readinessScore(data.todayBiofeedback);
  const readinessTone = readiness ? READINESS_TONE[readiness.level] : colors.mint;

  // Il NUMERO DOMINANTE della Home è la prontezza (unico 64px, sopra la piega).
  // Il FARO della schermata resta la card dell'allenamento, e nient'altro.
  const workoutTone = data.todayWorkout ? (data.todayWorkoutDone ? colors.mint : colors.accent) : null;
  const workoutDuration = data.todayWorkout?.estimated_duration_min;

  return (
    <SafeAreaView style={sharedStyles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={sharedStyles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Saluto e data su una riga sola: il palcoscenico è della prontezza, non del nome. */}
        <View style={styles.header}>
          <Text style={styles.greeting} numberOfLines={1}>
            Ciao{data.firstName ? `, ${data.firstName}` : ''}!
          </Text>
          <Text style={type.label}>{dateLabel}</Text>
        </View>

        {!data.coachClient ? (
          <EmptyState
            emoji="🤝"
            title="Nessun coach collegato"
            message="Quando il tuo coach ti aggiungerà, qui troverai allenamenti, piano nutrizionale e check-in settimanali."
          />
        ) : (
          <>
            {/* IL NUMERO DOMINANTE: la prontezza, alta e sopra la piega, letta in tre secondi. */}
            {readiness && score != null ? (
              <Card title="Prontezza di oggi">
                <MetricBlock
                  value={score.toFixed(1).replace('.', ',')}
                  unit="/10"
                  color={readinessTone}
                  trailing={
                    <ActivityRing progress={score / 10} color={readinessTone} size={88} strokeWidth={12}>
                      <Ionicons name={READINESS_ICON[readiness.level]} size={30} color={readinessTone} />
                    </ActivityRing>
                  }
                />
                <View style={styles.noteBlock}>
                  <View style={[styles.toneDot, { backgroundColor: readinessTone }]} />
                  <View style={styles.noteBody}>
                    <Text style={[styles.readinessLabel, { color: readinessTone }]}>{readiness.label}</Text>
                    <Text style={styles.noteText}>{readiness.advice}</Text>
                  </View>
                </View>
              </Card>
            ) : null}

            {/* IL FARO: cosa si fa oggi e l'azione primaria, a tutta larghezza. */}
            <Card
              title="Allenamento di oggi"
              beacon={workoutTone ?? undefined}
              style={workoutTone ? shadow.beacon(workoutTone) : undefined}
            >
              {data.todayWorkout ? (
                <>
                  <Text style={styles.workoutName}>{data.todayWorkout.name}</Text>
                  {data.todayWorkout.goal || workoutDuration ? (
                    <View style={styles.chipRow}>
                      {data.todayWorkout.goal ? (
                        <View style={styles.chip}>
                          <Ionicons name="flag-outline" size={15} color={colors.textSecondary} />
                          <Text style={styles.chipText}>{data.todayWorkout.goal}</Text>
                        </View>
                      ) : null}
                      {workoutDuration ? (
                        <View style={styles.chip}>
                          <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
                          <Text style={[styles.chipText, tabular]}>~{workoutDuration} min</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                  {data.todayWorkout.coach_notes ? (
                    <View style={styles.noteBlock}>
                      <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.textSecondary} />
                      <View style={styles.noteBody}>
                        <Text style={type.label}>Note del coach</Text>
                        <Text style={styles.noteText}>{data.todayWorkout.coach_notes}</Text>
                      </View>
                    </View>
                  ) : null}
                  {data.todayWorkoutDone ? (
                    <View style={styles.statusRow}>
                      <Ionicons name="checkmark-circle" size={22} color={colors.mint} />
                      <Text style={styles.doneText}>Completato — ottimo lavoro!</Text>
                    </View>
                  ) : (
                    <PrimaryButton
                      label="INIZIA ALLENAMENTO"
                      onPress={() => router.push(`/workout/${data.todayWorkout?.id}`)}
                      style={styles.fullWidth}
                    />
                  )}
                </>
              ) : (
                <View style={styles.statusRow}>
                  <Ionicons name="moon" size={22} color={colors.cyan} />
                  <Text style={styles.body}>Nessun allenamento in programma: riposo e recupero.</Text>
                </View>
              )}
            </Card>

            <Card title="Check biofeedback di oggi">
              {data.todayBiofeedback ? (
                <View style={styles.biofeedbackRow}>
                  <View style={styles.statusRow}>
                    <Ionicons name="checkmark-circle" size={22} color={colors.mint} />
                    <Text style={styles.doneText}>Completato</Text>
                  </View>
                  <Press
                    onPress={() => router.push('/biofeedback/oggi')}
                    hitSlop={8}
                    style={styles.link}
                    accessibilityLabel="Modifica il check di oggi"
                  >
                    <Text style={styles.linkText}>Modifica</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.accent} />
                  </Press>
                </View>
              ) : (
                <PrimaryButton
                  label="COMPILA IL CHECK DI OGGI"
                  onPress={() => router.push('/biofeedback/oggi')}
                  style={styles.fullWidth}
                />
              )}
            </Card>

            <Card title="Nutrizione di oggi">
              {data.nutritionDay ? (
                <>
                  {/* Le kcal sono un dato di supporto: scendono a metricSm, il 64px
                      resta alla sola prontezza (un solo numero dominante per schermata). */}
                  <View style={styles.kcalBlock}>
                    <View style={styles.kcalRow}>
                      <Text style={[styles.kcalValue, tabular]}>
                        {data.nutritionDay.kcal.toLocaleString('it-IT')}
                      </Text>
                      <Text style={styles.kcalUnit}>kcal</Text>
                    </View>
                    <Text style={styles.kcalCaption}>Obiettivo del giorno</Text>
                  </View>
                  {/* I macro sono dati categoriali, non segnali: scala neutra, mai i colori-segnale. */}
                  <View style={styles.pillRow}>
                    <StatPill
                      label="Proteine"
                      value={`${data.nutritionDay.protein_g}g`}
                      color={colors.macroProtein}
                    />
                    <StatPill label="Carbo" value={`${data.nutritionDay.carbs_g}g`} color={colors.macroCarbs} />
                    <StatPill label="Grassi" value={`${data.nutritionDay.fat_g}g`} color={colors.macroFat} />
                  </View>
                </>
              ) : (
                <Text style={styles.body}>
                  Nessun piano nutrizionale attivo per oggi. Chiedi al tuo coach!
                </Text>
              )}
            </Card>

            <Card title="Aggiungi velocemente">
              <View style={styles.quickRow}>
                <Press
                  onPress={() => toggleQuickForm('peso')}
                  haptic="light"
                  style={[styles.quickButton, quickForm === 'peso' && styles.quickButtonActive]}
                  accessibilityLabel="Registra peso"
                >
                  <Ionicons
                    name="scale-outline"
                    size={20}
                    color={quickForm === 'peso' ? colors.accent : colors.textSecondary}
                  />
                  <Text style={styles.quickButtonText}>Registra peso</Text>
                </Press>
                <Press
                  onPress={() => toggleQuickForm('nota')}
                  haptic="light"
                  style={[styles.quickButton, quickForm === 'nota' && styles.quickButtonActive]}
                  accessibilityLabel="Aggiungi nota"
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={quickForm === 'nota' ? colors.accent : colors.textSecondary}
                  />
                  <Text style={styles.quickButtonText}>Aggiungi nota</Text>
                </Press>
              </View>
              {quickForm ? (
                <>
                  <TextInput
                    style={[sharedStyles.input, quickForm === 'peso' ? tabular : styles.quickNote]}
                    value={quickValue}
                    onChangeText={setQuickValue}
                    placeholder={quickForm === 'peso' ? 'Peso in kg (es. 72,5)' : 'Nota di oggi per il coach'}
                    placeholderTextColor={colors.textTertiary}
                    keyboardType={quickForm === 'peso' ? 'decimal-pad' : 'default'}
                    multiline={quickForm === 'nota'}
                  />
                  <PrimaryButton label="Salva" onPress={saveQuick} loading={quickSaving} style={styles.fullWidth} />
                </>
              ) : null}
            </Card>

            <Card title="Check-in settimanale">
              {data.checkinDue ? (
                <>
                  <Text style={styles.body}>
                    È il momento del check-in di questa settimana: bastano 2 minuti.
                  </Text>
                  <PrimaryButton
                    label="COMPILA CHECK-IN"
                    variant="ghost"
                    onPress={() => router.push('/checkin/nuovo')}
                    style={styles.fullWidth}
                  />
                </>
              ) : (
                <View style={styles.statusRow}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.mint} />
                  <Text style={styles.doneText}>Check-in inviato, il coach lo sta esaminando.</Text>
                </View>
              )}
              {data.latestWeight != null ? (
                <View style={styles.weightRow}>
                  <Text style={type.label}>Ultimo peso registrato</Text>
                  <Text style={styles.weightValue}>{data.latestWeight} kg</Text>
                </View>
              ) : null}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Raggio interno delle superfici dentro una card (regola concentrica). */
const innerRadius = concentric(radius.lg, spacing.lg);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  greeting: {
    ...type.title,
    flexShrink: 1,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  workoutName: {
    ...type.display,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.raised,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexShrink: 1,
  },
  chipText: {
    ...type.callout,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  noteBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.raised,
    borderRadius: innerRadius,
    padding: spacing.lg,
  },
  noteBody: {
    flex: 1,
    gap: spacing.xs,
  },
  noteText: {
    ...type.body,
    color: colors.textSecondary,
    flex: 1,
  },
  readinessLabel: {
    ...type.body,
    fontWeight: '700',
  },
  toneDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    marginTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  body: {
    ...type.body,
    flexShrink: 1,
  },
  doneText: {
    ...type.body,
    fontWeight: '700',
    color: colors.mint,
    flexShrink: 1,
  },
  biofeedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingLeft: spacing.md,
  },
  linkText: {
    ...type.callout,
    color: colors.accent,
    fontWeight: '700',
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    backgroundColor: colors.raised,
    borderRadius: innerRadius,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  quickButtonActive: {
    borderColor: colors.accent,
  },
  quickButtonText: {
    ...type.callout,
    fontWeight: '700',
    flexShrink: 1,
  },
  quickNote: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  /** Metrica di supporto delle kcal: 34px, mai in gara con la prontezza. */
  kcalBlock: {
    gap: spacing.xs,
  },
  kcalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  kcalValue: {
    ...type.metricSm,
  },
  kcalUnit: {
    ...type.callout,
    color: colors.textSecondary,
    fontWeight: '700',
    marginBottom: 5,
  },
  kcalCaption: {
    ...type.muted,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.raised,
    borderRadius: innerRadius,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  weightValue: {
    ...type.body,
    ...tabular,
    fontWeight: '700',
  },
});
