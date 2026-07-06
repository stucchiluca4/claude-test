import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DAYS_OF_WEEK } from '@wc/shared';
import type { CoachClient, NutritionDay, ProgramWorkout } from '@wc/shared';
import { supabase } from '../../lib/supabase';
import { colors, spacing, sharedStyles } from '../../lib/theme';
import { mondayOfCurrentWeek, showError, startOfTodayIso, todayDayOfWeek } from '../../lib/utils';
import {
  currentWeekNumber,
  getActiveCoachClient,
  getActiveProgram,
  getTodayNutritionDay,
  getUserId,
  getWeekWorkouts,
} from '../../lib/queries';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { StatPill } from '../../components/StatPill';

interface HomeData {
  firstName: string;
  coachClient: CoachClient | null;
  todayWorkout: ProgramWorkout | null;
  todayWorkoutDone: boolean;
  nutritionDay: NutritionDay | null;
  latestWeight: number | null;
  checkinDue: boolean;
}

export default function HomeScreen() {
  const [data, setData] = useState<HomeData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
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
      }

      setData(next);
    } catch (e) {
      showError(e, 'Errore di caricamento');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
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
  doneText: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '700',
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
