import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DAYS_OF_WEEK, readinessFromBiofeedback } from '@wc/shared';
import type { CoachClient, NutritionDay, ProgramWorkout } from '@wc/shared';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, sharedStyles } from '../../lib/theme';
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
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { StatPill } from '../../components/StatPill';
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
    return (
      <SafeAreaView style={sharedStyles.screen} edges={['top']}>
        <View style={sharedStyles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={sharedStyles.muted}>Carico la tua giornata…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const today = new Date();
  const dateLabel = `${DAYS_OF_WEEK[todayDayOfWeek() - 1]} ${today.getDate()}/${today.getMonth() + 1}`;
  const readiness = readinessFromBiofeedback(data.todayBiofeedback);

  return (
    <SafeAreaView style={sharedStyles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={sharedStyles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <View>
          <Text style={sharedStyles.screenTitle}>
            Ciao{data.firstName ? `, ${data.firstName}` : ''}!
          </Text>
          <Text style={sharedStyles.muted}>{dateLabel}</Text>
        </View>

        {!data.coachClient ? (
          <Card title="Benvenuto">
            <Text style={sharedStyles.body}>
              Non sei ancora collegato a un coach. Quando il tuo coach ti aggiungerà, qui troverai
              allenamenti, piano nutrizionale e check-in settimanali.
            </Text>
          </Card>
        ) : (
          <>
            {readiness ? (
              <Card title="Prontezza di oggi">
                <View style={styles.readinessRow}>
                  <Text style={styles.readinessEmoji}>{readiness.emoji}</Text>
                  <View style={styles.readinessInfo}>
                    <Text style={styles.readinessLabel}>{readiness.label}</Text>
                    <Text style={sharedStyles.muted}>{readiness.advice}</Text>
                  </View>
                </View>
              </Card>
            ) : null}

            <Card title="Oggi">
              {data.todayWorkout ? (
                <>
                  <Text style={styles.workoutName}>{data.todayWorkout.name}</Text>
                  <Text style={sharedStyles.muted}>
                    {[
                      data.todayWorkout.goal,
                      data.todayWorkout.estimated_duration_min
                        ? `~${data.todayWorkout.estimated_duration_min} min`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  {data.todayWorkout.coach_notes ? (
                    <Text style={sharedStyles.muted}>Note del coach: {data.todayWorkout.coach_notes}</Text>
                  ) : null}
                  {data.todayWorkoutDone ? (
                    <Text style={styles.doneText}>✓ Completato — ottimo lavoro!</Text>
                  ) : (
                    <PrimaryButton
                      label="INIZIA ALLENAMENTO"
                      onPress={() => router.push(`/workout/${data.todayWorkout?.id}`)}
                    />
                  )}
                </>
              ) : (
                <Text style={sharedStyles.body}>
                  Oggi nessun allenamento in programma: riposo e recupero! 💤
                </Text>
              )}
            </Card>

            <Card title="Check biofeedback di oggi">
              {data.todayBiofeedback ? (
                <View style={styles.biofeedbackRow}>
                  <Text style={styles.doneText}>✓ Completato</Text>
                  <Pressable onPress={() => router.push('/biofeedback/oggi')} hitSlop={8}>
                    <Text style={styles.linkText}>Modifica</Text>
                  </Pressable>
                </View>
              ) : (
                <PrimaryButton
                  label="▶ Compila il check di oggi"
                  onPress={() => router.push('/biofeedback/oggi')}
                />
              )}
            </Card>

            <Card title="Aggiungi velocemente">
              <View style={styles.quickRow}>
                <Pressable
                  style={[styles.quickButton, quickForm === 'peso' && styles.quickButtonActive]}
                  onPress={() => toggleQuickForm('peso')}
                >
                  <Text style={styles.quickButtonText}>⚖️ Registra peso</Text>
                </Pressable>
                <Pressable
                  style={[styles.quickButton, quickForm === 'nota' && styles.quickButtonActive]}
                  onPress={() => toggleQuickForm('nota')}
                >
                  <Text style={styles.quickButtonText}>📝 Aggiungi nota</Text>
                </Pressable>
              </View>
              {quickForm ? (
                <>
                  <TextInput
                    style={[sharedStyles.input, quickForm === 'nota' && styles.quickNote]}
                    value={quickValue}
                    onChangeText={setQuickValue}
                    placeholder={quickForm === 'peso' ? 'Peso in kg (es. 72,5)' : 'Nota di oggi per il coach'}
                    placeholderTextColor={colors.textSecondary}
                    keyboardType={quickForm === 'peso' ? 'decimal-pad' : 'default'}
                    multiline={quickForm === 'nota'}
                  />
                  <PrimaryButton label="Salva" onPress={saveQuick} loading={quickSaving} />
                </>
              ) : null}
            </Card>

            <Card title="Nutrizione di oggi">
              {data.nutritionDay ? (
                <>
                  <View style={styles.kcalRow}>
                    <Text style={sharedStyles.bigNumber}>{data.nutritionDay.kcal}</Text>
                    <Text style={styles.kcalUnit}>kcal</Text>
                  </View>
                  <View style={styles.pillRow}>
                    <StatPill label="Proteine" value={`${data.nutritionDay.protein_g}g`} color={colors.accent} />
                    <StatPill label="Carbo" value={`${data.nutritionDay.carbs_g}g`} color={colors.warning} />
                    <StatPill label="Grassi" value={`${data.nutritionDay.fat_g}g`} color={colors.success} />
                  </View>
                </>
              ) : (
                <Text style={sharedStyles.body}>
                  Nessun piano nutrizionale attivo per oggi. Chiedi al tuo coach!
                </Text>
              )}
            </Card>

            <Card title="Check-in settimanale">
              {data.checkinDue ? (
                <>
                  <Text style={sharedStyles.body}>
                    È il momento del check-in di questa settimana: bastano 2 minuti.
                  </Text>
                  <PrimaryButton label="COMPILA CHECK-IN" variant="ghost" onPress={() => router.push('/checkin/nuovo')} />
                </>
              ) : (
                <Text style={styles.doneText}>✓ Check-in inviato, il coach lo sta esaminando.</Text>
              )}
              {data.latestWeight != null ? (
                <Text style={sharedStyles.muted}>Ultimo peso registrato: {data.latestWeight} kg</Text>
              ) : null}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  workoutName: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  readinessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  readinessEmoji: {
    fontSize: 40,
  },
  readinessInfo: {
    flex: 1,
    gap: 2,
  },
  readinessLabel: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  doneText: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '700',
  },
  biofeedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  quickButtonActive: {
    borderColor: colors.accent,
  },
  quickButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  quickNote: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  kcalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  kcalUnit: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
