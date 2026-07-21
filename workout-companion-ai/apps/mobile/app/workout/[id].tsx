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
import { estimate1RM, loadSuggestion, setVolume } from '@wc/shared';
import type { ExerciseFeedback, ExerciseSet, ProgramWorkout, RecordType, SetLog, WorkoutExercise } from '@wc/shared';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, sharedStyles } from '../../lib/theme';
import { formatClock, localDateString, parseNum, showError } from '../../lib/utils';
import {
  getActiveCoachClient,
  getExerciseFeedbackForLog,
  getUserId,
  savePersonalRecords,
  upsertExerciseFeedback,
  type ExercisePrCandidate,
} from '../../lib/queries';
import { PrimaryButton } from '../../components/PrimaryButton';
import { RestTimer } from '../../components/RestTimer';
import { SetRow, type SetEntry } from '../../components/SetRow';
import { ExerciseFeedbackModal, type ExerciseFeedbackValues } from '../../components/ExerciseFeedbackModal';
import { AdvancedTimer } from '../../components/AdvancedTimer';
import { AiCoachSheet } from '../../components/AiCoachSheet';
import { ExerciseMediaBar } from '../../components/ExerciseMediaBar';

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
  // Feedback per esercizio (chiave = workout_exercise_id).
  const [feedbacks, setFeedbacks] = useState<Record<string, ExerciseFeedback>>({});
  const [feedbackFor, setFeedbackFor] = useState<WorkoutExercise | null>(null);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [aiFor, setAiFor] = useState<WorkoutExercise | null>(null);
  const [coachClientId, setCoachClientId] = useState<string | null>(null);
  const [clientUid, setClientUid] = useState<string | null>(null);

  // Caricamento scheda + apertura del workout_log + ultima performance.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!id) return;
      try {
        const uid = await getUserId();
        if (!uid) throw new Error('Sessione scaduta, effettua di nuovo l’accesso.');

        const activeCc = await getActiveCoachClient(uid);

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

        // Riprende un'eventuale sessione ancora aperta di oggi (completed_at null)
        // invece di creare una nuova riga a ogni apertura della schermata.
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { data: openLog, error: openError } = await supabase
          .from('workout_logs')
          .select('id, started_at')
          .eq('program_workout_id', id)
          .eq('client_id', uid)
          .is('completed_at', null)
          .gte('started_at', todayStart.toISOString())
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (openError) throw new Error(openError.message);

        let newLog = openLog as { id: string; started_at: string } | null;
        if (!newLog) {
          const { data: log, error: logError } = await supabase
            .from('workout_logs')
            .insert({ program_workout_id: id, client_id: uid })
            .select('id, started_at')
            .single();
          if (logError) throw new Error(logError.message);
          newLog = log as { id: string; started_at: string };
        }

        // Se riprendiamo una sessione, ripristiniamo le serie già registrate.
        const resumedEntries: Record<string, RowState> = {};
        if (openLog) {
          const { data: prevSets, error: prevSetsError } = await supabase
            .from('set_logs')
            .select('*')
            .eq('workout_log_id', newLog.id);
          if (prevSetsError) throw new Error(prevSetsError.message);
          for (const row of (prevSets ?? []) as SetLog[]) {
            if (!row.workout_exercise_id) continue;
            resumedEntries[entryKey(row.workout_exercise_id, row.set_number)] = {
              load: row.load_kg != null ? String(row.load_kg) : '',
              reps: row.reps != null ? String(row.reps) : '',
              rpe: row.rpe != null ? String(row.rpe) : '',
              completed: row.completed,
              logRowId: row.id,
            };
          }
        }

        // Cronometro con un unico riferimento: l'orologio del dispositivo.
        // Per una sessione ripresa ricaviamo una sola volta i secondi già
        // trascorsi, poi il tempo avanza solo con Date.now() e non salta.
        const alreadyElapsedMs = openLog
          ? Math.max(0, Date.now() - new Date(newLog.started_at).getTime())
          : 0;
        startedAtRef.current = Date.now() - alreadyElapsedMs;

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

        // Feedback per esercizio già registrati in questa seduta (per riprenderli).
        const fbRows = await getExerciseFeedbackForLog(newLog.id);
        const fbMap: Record<string, ExerciseFeedback> = {};
        for (const fb of fbRows) fbMap[fb.workout_exercise_id] = fb;

        if (cancelled) return;
        setWorkout(loaded);
        setLogId(newLog.id);
        setLastPerf(perf);
        setFeedbacks(fbMap);
        setCoachClientId(activeCc?.id ?? null);
        setClientUid(uid);
        if (Object.keys(resumedEntries).length > 0) setEntries(resumedEntries);
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
        // Ultima serie dell'esercizio completata: chiedi il feedback (una volta).
        const setsOfEx = we.exercise_sets ?? [];
        const allDone =
          setsOfEx.length > 0 &&
          setsOfEx.every((s) =>
            s.set_number === set.set_number
              ? true
              : (entries[entryKey(we.id, s.set_number)]?.completed ?? false),
          );
        if (allDone && !feedbacks[we.id]) setFeedbackFor(we);
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

  async function saveFeedback(values: ExerciseFeedbackValues) {
    const we = feedbackFor;
    if (!we || !logId) return;
    setSavingFeedback(true);
    try {
      const saved = await upsertExerciseFeedback({
        workout_log_id: logId,
        workout_exercise_id: we.id,
        exercise_id: we.exercise_id,
        rpe: values.rpe,
        difficulty: values.difficulty,
        energy: values.energy,
        pain: values.pain,
        notes: values.notes || null,
      });
      setFeedbacks((prev) => ({ ...prev, [we.id]: saved }));
      setFeedbackFor(null);
    } catch (e) {
      showError(e, 'Salvataggio feedback non riuscito');
    } finally {
      setSavingFeedback(false);
    }
  }

  /** Porta il focus sul primo esercizio con serie ancora da completare. */
  function goToNextExercise() {
    const list = workout?.workout_exercises ?? [];
    const next = list.find((we) =>
      (we.exercise_sets ?? []).some((s) => !(entries[entryKey(we.id, s.set_number)]?.completed)),
    );
    if (next) setExpanded({ [next.id]: true });
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
              const uid = await getUserId();

              // Volume totale + migliori valori per esercizio (candidati record).
              let total = 0;
              const byExercise = new Map<string, ExercisePrCandidate>();
              const consider = (
                exerciseId: string,
                type: RecordType,
                value: number | null,
                setLogId: string | null | undefined,
              ) => {
                if (value == null || !(value > 0)) return;
                const candidate =
                  byExercise.get(exerciseId) ?? { exercise_id: exerciseId, bests: {} };
                const currentBest = candidate.bests[type];
                if (!currentBest || value > currentBest.value) {
                  candidate.bests[type] = { value, setLogId: setLogId ?? null };
                }
                byExercise.set(exerciseId, candidate);
              };
              for (const we of workout?.workout_exercises ?? []) {
                for (const set of we.exercise_sets ?? []) {
                  const entry = entries[entryKey(we.id, set.set_number)];
                  if (!entry?.completed) continue;
                  const load = parseNum(entry.load);
                  const reps = parseNum(entry.reps);
                  if (load == null || reps == null) continue;
                  total += setVolume(load, reps);
                  consider(we.exercise_id, 'max_load', load, entry.logRowId);
                  consider(we.exercise_id, 'max_reps', reps, entry.logRowId);
                  consider(we.exercise_id, 'max_volume', setVolume(load, reps), entry.logRowId);
                  consider(we.exercise_id, 'estimated_1rm', estimate1RM(load, Math.round(reps)), entry.logRowId);
                }
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

              // Record personali: salva solo i miglioramenti. Se fallisce non
              // blocca la chiusura (il riepilogo mostrera' 0 record).
              if (uid && byExercise.size > 0) {
                try {
                  await savePersonalRecords(uid, [...byExercise.values()], localDateString(new Date()));
                } catch {
                  // non bloccante
                }
              }

              router.replace(`/workout/riepilogo/${logId}`);
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
          <Pressable style={styles.timerBtn} onPress={() => setShowTimer(true)} hitSlop={8}>
            <Text style={styles.timerBtnText}>⏱</Text>
          </Pressable>
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
                      {(() => {
                        if (!prev || prev.length === 0) return null;
                        const topSet = prev.reduce((a, b) =>
                          Number(b.load_kg ?? 0) > Number(a.load_kg ?? 0) ? b : a,
                        );
                        const firstPrescribed = we.exercise_sets?.[0];
                        const tip = loadSuggestion({
                          lastLoadKg: topSet.load_kg,
                          lastReps: topSet.reps,
                          lastRpe: topSet.rpe,
                          targetRpe: firstPrescribed?.target_rpe ?? null,
                          repsMax: firstPrescribed?.reps_max ?? null,
                        });
                        return tip ? <Text style={styles.tip}>💡 {tip}</Text> : null;
                      })()}
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

                      <Pressable
                        style={[styles.feedbackBtn, feedbacks[we.id] && styles.feedbackBtnDone]}
                        onPress={() => setFeedbackFor(we)}
                      >
                        <Text style={styles.feedbackBtnText}>
                          {feedbacks[we.id]
                            ? '✓ Feedback salvato · tocca per modificare'
                            : '💬 Com’è andato questo esercizio?'}
                        </Text>
                      </Pressable>
                      <Pressable style={styles.aiBtn} onPress={() => setAiFor(we)}>
                        <Text style={styles.aiBtnText}>🤖 Chiedi al coach AI</Text>
                      </Pressable>
                      <ExerciseMediaBar
                        clientId={clientUid}
                        workoutLogId={logId ?? ''}
                        workoutExerciseId={we.id}
                        exerciseId={we.exercise_id}
                      />
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

        <ExerciseFeedbackModal
          visible={feedbackFor != null}
          exerciseName={feedbackFor?.exercise?.name ?? 'Esercizio'}
          initial={
            feedbackFor && feedbacks[feedbackFor.id]
              ? {
                  rpe: feedbacks[feedbackFor.id].rpe,
                  difficulty: feedbacks[feedbackFor.id].difficulty,
                  energy: feedbacks[feedbackFor.id].energy,
                  pain: feedbacks[feedbackFor.id].pain,
                  notes: feedbacks[feedbackFor.id].notes ?? '',
                }
              : undefined
          }
          saving={savingFeedback}
          onSave={saveFeedback}
          onClose={() => setFeedbackFor(null)}
        />

        <AdvancedTimer
          visible={showTimer}
          onClose={() => setShowTimer(false)}
          onAutoNext={() => {
            setShowTimer(false);
            goToNextExercise();
          }}
        />

        {aiFor ? (
          <AiCoachSheet
            visible={aiFor != null}
            exerciseId={aiFor.exercise_id}
            workoutExerciseId={aiFor.id}
            exerciseName={aiFor.exercise?.name ?? 'Esercizio'}
            coachClientId={coachClientId}
            onClose={() => setAiFor(null)}
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
  timerBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBtnText: {
    fontSize: 20,
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
  tip: {
    color: colors.celeste,
    fontSize: 13,
    fontWeight: '600',
  },
  feedbackBtn: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  feedbackBtnDone: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(56,189,248,0.08)',
  },
  feedbackBtnText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  aiBtn: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    backgroundColor: 'rgba(56,189,248,0.06)',
  },
  aiBtnText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
});
