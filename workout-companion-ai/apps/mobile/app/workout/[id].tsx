import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setVolume } from '@wc/shared';
import type { ExerciseSet, ProgramWorkout, SetLog, WorkoutExercise } from '@wc/shared';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, sharedStyles } from '../../lib/theme';
import { formatClock, parseNum, showError } from '../../lib/utils';
import { getUserId } from '../../lib/queries';
import { PrimaryButton } from '../../components/PrimaryButton';
import { RestTimer } from '../../components/RestTimer';
import { SetRow, type SetEntry } from '../../components/SetRow';

interface RowState extends SetEntry {
  /** id della riga in set_logs una volta salvata (per gli update successivi). */
  logRowId?: string;
  saving?: boolean;
}

interface RestState {
  seconds: number;
  token: number;
}

const emptyEntry: RowState = { load: '', reps: '', rpe: '', completed: false };

function entryKey(workoutExerciseId: string, setNumber: number): string {
  return `${workoutExerciseId}:${setNumber}`;
}

/** "80×8 @8 · 82.5×6" per l'ultima seduta registrata. */
function lastPerformanceText(logs: SetLog[]): string {
  return logs
    .map((l) => {
      const rpe = l.rpe != null ? ` @${l.rpe}` : '';
      return `${l.load_kg ?? '—'}×${l.reps ?? '—'}${rpe}`;
    })
    .join(' · ');
}

export default function WorkoutTrackerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [workout, setWorkout] = useState<ProgramWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [logId, setLogId] = useState<string | null>(null);
  const [lastPerf, setLastPerf] = useState<Record<string, SetLog[]>>({});
  const [entries, setEntries] = useState<Record<string, RowState>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [rest, setRest] = useState<RestState | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const startedAtRef = useRef<number>(Date.now());

  // Caricamento scheda + apertura del workout_log + ultima performance.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!id) return;
      try {
        const uid = await getUserId();
        if (!uid) throw new Error('Sessione scaduta, effettua di nuovo l’accesso.');

        const { data: pw, error: pwError } = await supabase
          .from('program_workouts')
          .select('*, workout_exercises(*, exercise:exercises(*), exercise_sets(*))')
          .eq('id', id)
          .maybeSingle();
        if (pwError) throw new Error(pwError.message);
        if (!pw) throw new Error('Allenamento non trovato.');

        const loaded = pw as unknown as ProgramWorkout;
        loaded.workout_exercises = [...(loaded.workout_exercises ?? [])].sort(
          (a, b) => a.sort_order - b.sort_order
        );
        for (const we of loaded.workout_exercises) {
          we.exercise_sets = [...(we.exercise_sets ?? [])].sort((a, b) => a.set_number - b.set_number);
        }

        const { data: log, error: logError } = await supabase
          .from('workout_logs')
          .insert({ program_workout_id: id, client_id: uid })
          .select('id, started_at')
          .single();
        if (logError) throw new Error(logError.message);
        const newLog = log as { id: string; started_at: string };
        startedAtRef.current = new Date(newLog.started_at).getTime();

        // Ultima performance per esercizio: serie dell'ultima seduta registrata.
        const exerciseIds = loaded.workout_exercises.map((we) => we.exercise_id);
        let perf: Record<string, SetLog[]> = {};
        if (exerciseIds.length > 0) {
          const { data: prev, error: prevError } = await supabase
            .from('set_logs')
            .select('*')
            .in('exercise_id', exerciseIds)
            .eq('completed', true)
            .neq('workout_log_id', newLog.id)
            .order('logged_at', { ascending: false })
            .limit(200);
          if (prevError) throw new Error(prevError.message);
          const rows = (prev ?? []) as SetLog[];
          perf = {};
          for (const exId of exerciseIds) {
            const forEx = rows.filter((r) => r.exercise_id === exId);
            if (forEx.length === 0) continue;
            const lastWorkoutLog = forEx[0].workout_log_id;
            perf[exId] = forEx
              .filter((r) => r.workout_log_id === lastWorkoutLog)
              .sort((a, b) => a.set_number - b.set_number);
          }
        }

        if (cancelled) return;
        setWorkout(loaded);
        setLogId(newLog.id);
        setLastPerf(perf);
        // Il primo esercizio parte aperto.
        const first = loaded.workout_exercises[0];
        if (first) setExpanded({ [first.id]: true });
      } catch (e) {
        if (!cancelled) {
          showError(e, 'Impossibile avviare l’allenamento');
          router.back();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  // Cronometro di seduta.
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const updateEntry = useCallback((key: string, patch: Partial<RowState>) => {
    setEntries((prev) => ({ ...prev, [key]: { ...(prev[key] ?? emptyEntry), ...patch } }));
  }, []);

  async function toggleSet(we: WorkoutExercise, set: ExerciseSet) {
    if (!logId) return;
    const key = entryKey(we.id, set.set_number);
    const entry = entries[key] ?? emptyEntry;

    try {
      if (!entry.completed) {
        const load = parseNum(entry.load);
        const reps = parseNum(entry.reps);
        if (load == null || reps == null) {
          Alert.alert('Dati mancanti', 'Inserisci carico e ripetizioni prima di completare la serie.');
          return;
        }
        updateEntry(key, { saving: true });
        const payload = {
          workout_log_id: logId,
          workout_exercise_id: we.id,
          exercise_id: we.exercise_id,
          set_number: set.set_number,
          load_kg: load,
          reps: Math.round(reps),
          rpe: parseNum(entry.rpe),
          completed: true,
        };
        let logRowId = entry.logRowId;
        if (logRowId) {
          const { error } = await supabase.from('set_logs').update(payload).eq('id', logRowId);
          if (error) throw new Error(error.message);
        } else {
          const { data, error } = await supabase.from('set_logs').insert(payload).select('id').single();
          if (error) throw new Error(error.message);
          logRowId = (data as { id: string }).id;
        }
        updateEntry(key, { completed: true, saving: false, logRowId });
        if (set.rest_seconds && set.rest_seconds > 0) {
          setRest({ seconds: set.rest_seconds, token: Date.now() });
        }
      } else if (entry.logRowId) {
        // Deseleziona: la serie torna modificabile.
        updateEntry(key, { saving: true });
        const { error } = await supabase
          .from('set_logs')
          .update({ completed: false })
          .eq('id', entry.logRowId);
        if (error) throw new Error(error.message);
        updateEntry(key, { completed: false, saving: false });
      }
    } catch (e) {
      updateEntry(key, { saving: false });
      showError(e, 'Salvataggio non riuscito');
    }
  }

  const completedCount = useMemo(
    () => Object.values(entries).filter((e) => e.completed).length,
    [entries]
  );

  const totalSets = useMemo(
    () => (workout?.workout_exercises ?? []).reduce((acc, we) => acc + (we.exercise_sets?.length ?? 0), 0),
    [workout]
  );

  function completeWorkout() {
    if (!logId) return;
    Alert.alert(
      'Completare l’allenamento?',
      `Hai registrato ${completedCount} serie su ${totalSets}.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Completa',
          onPress: async () => {
            try {
              setFinishing(true);
              // Volume totale = somma carico × ripetizioni delle serie completate.
              let total = 0;
              for (const e of Object.values(entries)) {
                if (!e.completed) continue;
                const load = parseNum(e.load);
                const reps = parseNum(e.reps);
                if (load != null && reps != null) total += setVolume(load, reps);
              }
              const durationMin = Math.max(1, Math.round(elapsed / 60));
              const { error } = await supabase
                .from('workout_logs')
                .update({
                  completed_at: new Date().toISOString(),
                  duration_min: durationMin,
                  total_volume_kg: Math.round(total * 10) / 10,
                })
                .eq('id', logId);
              if (error) throw new Error(error.message);
              Alert.alert(
                'Ottimo lavoro! 💪',
                `Allenamento completato in ${durationMin} min.\nVolume totale: ${Math.round(total)} kg.`,
                [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
              );
            } catch (e) {
              showError(e, 'Chiusura non riuscita');
            } finally {
              setFinishing(false);
            }
          },
        },
      ]
    );
  }

  if (loading || !workout) {
    return (
      <SafeAreaView style={sharedStyles.screen}>
        <View style={sharedStyles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={sharedStyles.muted}>Preparo la tua scheda…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const exercises = workout.workout_exercises ?? [];

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header con cronometro di seduta */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {workout.name}
            </Text>
            <Text style={sharedStyles.muted}>
              {completedCount}/{totalSets} serie
            </Text>
          </View>
          <Text style={styles.stopwatch}>{formatClock(elapsed)}</Text>
        </View>

        <ScrollView contentContainerStyle={sharedStyles.content} keyboardShouldPersistTaps="handled">
          {exercises.length === 0 ? (
            <View style={sharedStyles.center}>
              <Text style={sharedStyles.body}>Questa scheda non ha ancora esercizi.</Text>
            </View>
          ) : (
            exercises.map((we, index) => {
              const isOpen = expanded[we.id] ?? false;
              const prev = lastPerf[we.exercise_id];
              return (
                <View key={we.id} style={styles.exerciseCard}>
                  <Pressable
                    style={styles.exerciseHeader}
                    onPress={() => setExpanded((prevState) => ({ ...prevState, [we.id]: !isOpen }))}
                  >
                    <View style={styles.exerciseTitleBox}>
                      <Text style={styles.exerciseName}>
                        {index + 1}. {we.exercise?.name ?? 'Esercizio'}
                      </Text>
                      <Text style={sharedStyles.muted}>
                        {[we.exercise?.muscle_group, we.exercise?.equipment].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>{isOpen ? '▾' : '▸'}</Text>
                  </Pressable>

                  {isOpen ? (
                    <View style={styles.exerciseBody}>
                      {we.coach_notes ? (
                        <Text style={styles.coachNotes}>📝 {we.coach_notes}</Text>
                      ) : null}
                      <Text style={sharedStyles.muted}>
                        Ultima performance:{' '}
                        {prev && prev.length > 0 ? lastPerformanceText(prev) : 'nessun dato precedente'}
                      </Text>
                      {(we.exercise_sets ?? []).map((set) => {
                        const key = entryKey(we.id, set.set_number);
                        const entry = entries[key] ?? emptyEntry;
                        return (
                          <SetRow
                            key={set.id}
                            set={set}
                            entry={entry}
                            saving={entry.saving}
                            onChange={(field, value) => updateEntry(key, { [field]: value } as Partial<RowState>)}
                            onToggle={() => toggleSet(we, set)}
                          />
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}

          <PrimaryButton
            label="COMPLETA ALLENAMENTO"
            variant="success"
            onPress={completeWorkout}
            loading={finishing}
          />
        </ScrollView>

        {rest ? (
          <RestTimer
            seconds={rest.seconds}
            resetToken={rest.token}
            onFinish={() => setRest(null)}
            onSkip={() => setRest(null)}
          />
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  close: {
    color: colors.textSecondary,
    fontSize: 20,
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  stopwatch: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  exerciseCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  exerciseTitleBox: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  chevron: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  exerciseBody: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  coachNotes: {
    color: colors.warning,
    fontSize: 13,
  },
});
