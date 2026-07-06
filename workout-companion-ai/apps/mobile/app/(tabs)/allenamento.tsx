import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DAYS_OF_WEEK } from '@wc/shared';
import type { ProgramWorkout } from '@wc/shared';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, sharedStyles } from '../../lib/theme';
import { mondayOfCurrentWeek, showError } from '../../lib/utils';
import { currentWeekNumber, getActiveCoachClient, getActiveProgram, getUserId, getWeekWorkouts } from '../../lib/queries';
import { Card } from '../../components/Card';

interface WeekData {
  programName: string | null;
  weekNumber: number;
  workouts: ProgramWorkout[];
  doneIds: Set<string>;
}

export default function AllenamentoScreen() {
  const [data, setData] = useState<WeekData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const uid = await getUserId();
      if (!uid) return;

      const empty: WeekData = { programName: null, weekNumber: 1, workouts: [], doneIds: new Set() };
      const cc = await getActiveCoachClient(uid);
      if (!cc) {
        setData(empty);
        return;
      }
      const program = await getActiveProgram(cc.id);
      if (!program) {
        setData(empty);
        return;
      }

      const weekNumber = currentWeekNumber(program);
      const workouts = await getWeekWorkouts(program.id, weekNumber);

      // Segna come "fatti" gli allenamenti completati in questa settimana.
      const doneIds = new Set<string>();
      if (workouts.length > 0) {
        const { data: logs, error } = await supabase
          .from('workout_logs')
          .select('program_workout_id')
          .eq('client_id', uid)
          .in('program_workout_id', workouts.map((w) => w.id))
          .not('completed_at', 'is', null)
          .gte('started_at', `${mondayOfCurrentWeek()}T00:00:00`);
        if (error) throw new Error(error.message);
        for (const row of (logs ?? []) as { program_workout_id: string | null }[]) {
          if (row.program_workout_id) doneIds.add(row.program_workout_id);
        }
      }

      setData({ programName: program.name, weekNumber, workouts, doneIds });
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
          <Text style={sharedStyles.muted}>Carico il tuo programma…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={sharedStyles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={sharedStyles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <View>
          <Text style={sharedStyles.screenTitle}>Allenamento</Text>
          {data.programName ? (
            <Text style={sharedStyles.muted}>
              {data.programName} · Settimana {data.weekNumber}
            </Text>
          ) : null}
        </View>

        {data.workouts.length === 0 ? (
          <Card>
            <Text style={sharedStyles.body}>
              Nessun allenamento in programma questa settimana. Il tuo coach sta preparando la scheda:
              torna a controllare più tardi!
            </Text>
          </Card>
        ) : (
          data.workouts.map((w) => {
            const done = data.doneIds.has(w.id);
            return (
              <Pressable key={w.id} style={styles.workoutRow} onPress={() => router.push(`/workout/${w.id}`)}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayText}>{DAYS_OF_WEEK[w.day_of_week - 1].slice(0, 3).toUpperCase()}</Text>
                </View>
                <View style={styles.workoutInfo}>
                  <Text style={styles.workoutName}>{w.name}</Text>
                  <Text style={sharedStyles.muted}>
                    {[w.goal, w.estimated_duration_min ? `~${w.estimated_duration_min} min` : null]
                      .filter(Boolean)
                      .join(' · ') || 'Tocca per i dettagli'}
                  </Text>
                </View>
                {done ? <Text style={styles.doneMark}>✓</Text> : <Text style={styles.chevron}>›</Text>}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  dayBadge: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  dayText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  workoutInfo: {
    flex: 1,
    gap: 2,
  },
  workoutName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  doneMark: {
    color: colors.success,
    fontSize: 20,
    fontWeight: '800',
  },
  chevron: {
    color: colors.textSecondary,
    fontSize: 22,
  },
});
