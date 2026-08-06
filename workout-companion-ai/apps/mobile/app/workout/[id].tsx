import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { estimate1RM, loadSuggestion, setVolume } from '@wc/shared';
import type { ExerciseFeedback, ExerciseSet, ProgramWorkout, RecordType, SetLog, WorkoutExercise } from '@wc/shared';
import { supabase } from '../../lib/supabase';
import { colors, concentric, radius, shadow, spacing, sharedStyles, tabular, type } from '../../lib/theme';
import { formatClock, localDateString, parseNum, showError, todayDayOfWeek } from '../../lib/utils';
import {
  getActiveCoachClient,
  getExerciseFeedbackForLog,
  getUserId,
  savePersonalRecords,
  upsertExerciseFeedback,
  type ExercisePrCandidate,
} from '../../lib/queries';
import { Appear, appearDelay } from '../../components/Appear';
import { GlassSurface } from '../../components/Glass';
import { Press } from '../../components/Press';
import { PrimaryButton } from '../../components/PrimaryButton';
import { RestTimer } from '../../components/RestTimer';
import { SetRow, type SetEntry } from '../../components/SetRow';
import { ExerciseFeedbackModal, type ExerciseFeedbackValues } from '../../components/ExerciseFeedbackModal';
import { AdvancedTimer } from '../../components/AdvancedTimer';
import { AiCoachSheet } from '../../components/AiCoachSheet';
import { ExerciseMediaBar } from '../../components/ExerciseMediaBar';
import { EmptyState, LoadingState } from '../../components/States';
import { demoLastPerf, demoWorkoutById, isDemo } from '../../lib/demo';

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

/** Raggio degli elementi dentro la card esercizio (26 − 16): curve parallele. */
const INNER = concentric(radius.lg, spacing.lg);

/**
 * Ferro al 92% (stessa materia di Card.tsx): la card resta opaca quanto basta
 * per leggere carichi e ripetizioni con le mani sudate, ma il campo luminoso di
 * fondo la tinge appena, così la superficie non legge come grigio morto.
 */
const IRON = 'rgba(21,26,36,0.92)';

/** Corsa di scorrimento entro cui il vetro si accende del tutto (px). */
const GLASS_RANGE = 120;

/** Scatto minimo sotto il quale non vale la pena ridisegnare il vetro. */
const GLASS_STEP = 0.05;

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
  // Apertura della galleria allegati per esercizio (solo presentazione).
  const [mediaOpen, setMediaOpen] = useState<Record<string, boolean>>({});
  // Altezze misurate dei due strati in vetro, per non coprire il contenuto.
  const [headerH, setHeaderH] = useState(104);
  const [barH, setBarH] = useState(92);
  // Quanto contenuto sta passando sotto il vetro (0 fermo, 1 dopo ~120px).
  const [glassActivity, setGlassActivity] = useState(0);
  const glassActivityRef = useRef(0);

  // Caricamento scheda + apertura del workout_log + ultima performance.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!id) return;

      // Modalità demo: allenamento di esempio, nessun accesso al database.
      // La condizione è la modalità, non l'id: la scheda della settimana apre
      // sedute con id diversi, e tutte devono restare dentro la demo.
      if (isDemo()) {
        const w = demoWorkoutById(String(id), todayDayOfWeek());
        if (cancelled) return;
        setWorkout(w);
        setLogId('demo');
        setLastPerf(demoLastPerf());
        setClientUid(null);
        setCoachClientId(null);
        setExpanded(w.workout_exercises?.[0] ? { [w.workout_exercises[0].id]: true } : {});
        startedAtRef.current = Date.now();
        setLoading(false);
        return;
      }

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

  /**
   * Accende il vetro in base a quanta lista gli è passata sotto: da 0 a 1 nei
   * primi 120px di scorrimento. Il valore è throttolato a scatti di 0.05 (e
   * fissato sugli estremi) così lo stato non si aggiorna a ogni frame.
   */
  const onListScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const next = Math.max(0, Math.min(1, y / GLASS_RANGE));
    const current = glassActivityRef.current;
    if (next === current) return;
    const settled = next === 0 || next === 1;
    if (!settled && Math.abs(next - current) < GLASS_STEP) return;
    glassActivityRef.current = next;
    setGlassActivity(next);
  }, []);

  async function toggleSet(we: WorkoutExercise, set: ExerciseSet) {
    if (!logId) return;
    const key = entryKey(we.id, set.set_number);
    const entry = entries[key] ?? emptyEntry;

    // Demo: tutto in locale, niente database.
    if (logId === 'demo') {
      if (!entry.completed) {
        const load = parseNum(entry.load);
        const reps = parseNum(entry.reps);
        if (load == null || reps == null) {
          Alert.alert('Dati mancanti', 'Inserisci carico e ripetizioni prima di completare la serie.');
          return;
        }
        updateEntry(key, { completed: true });
        if (set.rest_seconds && set.rest_seconds > 0) setRest({ seconds: set.rest_seconds, token: Date.now() });
        const setsOfEx = we.exercise_sets ?? [];
        const allDone =
          setsOfEx.length > 0 &&
          setsOfEx.every((s) =>
            s.set_number === set.set_number
              ? true
              : (entries[entryKey(we.id, s.set_number)]?.completed ?? false),
          );
        if (allDone && !feedbacks[we.id]) setFeedbackFor(we);
      } else {
        updateEntry(key, { completed: false });
      }
      return;
    }

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
    if (logId === 'demo') {
      setFeedbacks((prev) => ({
        ...prev,
        [we.id]: {
          id: `demo-fb-${we.id}`,
          workout_log_id: 'demo',
          workout_exercise_id: we.id,
          exercise_id: we.exercise_id,
          rpe: values.rpe,
          difficulty: values.difficulty,
          energy: values.energy,
          pain: values.pain,
          notes: values.notes || null,
          created_at: new Date().toISOString(),
        },
      }));
      setFeedbackFor(null);
      return;
    }
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

  /**
   * FARO UNICO (DESIGN.md § Elevation): una sola card può brillare. È quella su
   * cui l'atleta sta lavorando, cioè il primo esercizio aperto con serie ancora
   * da chiudere; se sono tutte chiuse, il primo aperto.
   */
  const beaconId = useMemo(() => {
    const open = (workout?.workout_exercises ?? []).filter((we) => expanded[we.id]);
    const working = open.find((we) =>
      (we.exercise_sets ?? []).some((s) => !(entries[entryKey(we.id, s.set_number)]?.completed)),
    );
    return working?.id ?? open[0]?.id ?? null;
  }, [workout, expanded, entries]);

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
              if (logId === 'demo') {
                setFinishing(false);
                Alert.alert(
                  'Allenamento completato! 💪',
                  'In modalità demo il riepilogo dettagliato (record, punteggio, recap AI) è disponibile solo con un account.',
                  [{ text: 'OK', onPress: () => router.replace('/(tabs)') }],
                );
                return;
              }
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
    return <LoadingState message="Preparo la tua scheda…" />;
  }

  const exercises = workout.workout_exercises ?? [];
  const progress = totalSets > 0 ? Math.min(1, completedCount / totalSets) : 0;
  // Il recupero galleggia appena sopra la barra d'azione, senza sovrapporsi.
  const restLift = spacing.md + barH - spacing.lg + spacing.sm;

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* FERRO: il contenuto scorre sotto i due strati in vetro. */}
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: headerH + spacing.lg, paddingBottom: barH + spacing.xxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={onListScroll}
          scrollEventThrottle={16}
        >
          {exercises.length === 0 ? (
            <Appear delay={appearDelay(0)}>
              <EmptyState
                emoji="🏋️"
                title="Nessun esercizio"
                message="Questa scheda non ha ancora esercizi. Chiedi al tuo coach di aggiungerli."
              />
            </Appear>
          ) : (
            exercises.map((we, index) => {
              const isOpen = expanded[we.id] ?? false;
              const isBeacon = beaconId === we.id;
              const prev = lastPerf[we.exercise_id];
              const sets = we.exercise_sets ?? [];
              const doneSets = sets.filter(
                (s) => entries[entryKey(we.id, s.set_number)]?.completed,
              ).length;
              const allDone = sets.length > 0 && doneSets === sets.length;
              const meta = [we.exercise?.muscle_group, we.exercise?.equipment]
                .filter(Boolean)
                .join(' · ');
              const hasFeedback = feedbacks[we.id] != null;
              const showMedia = mediaOpen[we.id] ?? false;

              return (
                // Schermata di dettaglio: l'entrata avviene UNA VOLTA sola
                // all'apertura, senza replayOnFocus (quello vive nelle schede).
                // La cascata 0/60/120/180 ms si ferma al quarto esercizio: oltre
                // sarebbe attesa, non movimento.
                <Appear
                  key={we.id}
                  delay={appearDelay(index)}
                  style={[styles.shell, isBeacon ? shadow.beacon(colors.accent) : null]}
                >
                  <View style={[styles.card, isBeacon && styles.cardBeacon]}>
                    <View style={styles.topLight} pointerEvents="none" />

                    <Press
                      style={styles.head}
                      scaleTo={0.99}
                      onPress={() => setExpanded((prevState) => ({ ...prevState, [we.id]: !isOpen }))}
                      accessibilityLabel={`${we.exercise?.name ?? 'Esercizio'}, ${doneSets} serie su ${sets.length}`}
                    >
                      <View style={[styles.index, allDone && styles.indexDone]}>
                        <Text style={[styles.indexText, tabular, allDone && styles.indexTextDone]}>
                          {index + 1}
                        </Text>
                      </View>

                      <View style={styles.headText}>
                        <Text style={type.title} numberOfLines={2}>
                          {we.exercise?.name ?? 'Esercizio'}
                        </Text>
                        {meta ? (
                          <Text style={type.label} numberOfLines={1}>
                            {meta}
                          </Text>
                        ) : null}
                      </View>

                      <View style={[styles.status, allDone && styles.statusDone]}>
                        {allDone ? <Ionicons name="checkmark" size={15} color={colors.mint} /> : null}
                        <Text style={[styles.statusText, tabular, allDone && styles.statusTextDone]}>
                          {doneSets}/{sets.length}
                        </Text>
                      </View>

                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textTertiary}
                      />
                    </Press>

                    {isOpen ? (
                      // Il corpo dell'esercizio sale a molla ogni volta che la
                      // card si apre: l'espansione non è più uno scatto secco.
                      <Appear style={styles.body}>
                        {we.coach_notes ? (
                          <View style={styles.note}>
                            <Ionicons
                              name="clipboard"
                              size={18}
                              color={colors.amber}
                              style={styles.blockIcon}
                            />
                            <Text style={[type.body, styles.blockText]}>{we.coach_notes}</Text>
                          </View>
                        ) : null}

                        <View style={styles.reference}>
                          <Text style={type.label}>Ultima volta</Text>
                          <Text style={[type.body, tabular, styles.referenceValue]}>
                            {prev && prev.length > 0 ? lastPerformanceText(prev) : 'Nessun dato precedente'}
                          </Text>
                        </View>

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
                          return tip ? (
                            <View style={styles.tip}>
                              <Ionicons
                                name="bulb"
                                size={18}
                                color={colors.cyan}
                                style={styles.blockIcon}
                              />
                              <Text style={[type.body, styles.blockText]}>{tip}</Text>
                            </View>
                          ) : null;
                        })()}

                        {sets.map((set) => {
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

                        <View style={styles.divider} />

                        {/* Riga di azioni compatte: una sola parola per bersaglio. */}
                        <View style={styles.actions}>
                          <Press
                            style={[styles.action, hasFeedback && styles.actionDone]}
                            onPress={() => setFeedbackFor(we)}
                            accessibilityLabel={
                              hasFeedback
                                ? 'Feedback salvato, tocca per modificare'
                                : 'Com’è andato questo esercizio?'
                            }
                          >
                            <Ionicons
                              name={hasFeedback ? 'checkmark-circle' : 'chatbubble-ellipses'}
                              size={20}
                              color={hasFeedback ? colors.mint : colors.textSecondary}
                            />
                            <Text style={[type.callout, styles.actionText, hasFeedback && styles.actionTextDone]}>
                              Feedback
                            </Text>
                          </Press>

                          <Press
                            style={styles.action}
                            onPress={() => setAiFor(we)}
                            accessibilityLabel="Chiedi al coach AI"
                          >
                            <Ionicons name="sparkles" size={20} color={colors.violet} />
                            <Text style={[type.callout, styles.actionText]}>Coach AI</Text>
                          </Press>

                          <Press
                            style={[styles.action, showMedia && styles.actionOpen]}
                            onPress={() => setMediaOpen((prevState) => ({ ...prevState, [we.id]: !showMedia }))}
                            accessibilityLabel="Foto e video dell’esercizio"
                          >
                            <Ionicons
                              name="camera"
                              size={20}
                              color={showMedia ? colors.accent : colors.textSecondary}
                            />
                            <Text style={[type.callout, styles.actionText, showMedia && styles.actionTextOpen]}>
                              Allegati
                            </Text>
                          </Press>
                        </View>

                        {/* La galleria resta montata anche da chiusa: il caricamento
                            degli allegati non deve dipendere dall'apertura. */}
                        <View style={showMedia ? undefined : styles.hidden}>
                          <ExerciseMediaBar
                            clientId={clientUid}
                            workoutLogId={logId ?? ''}
                            workoutExerciseId={we.id}
                            exerciseId={we.exercise_id}
                          />
                        </View>
                      </Appear>
                    ) : null}
                  </View>
                </Appear>
              );
            })
          )}
        </ScrollView>

        {/* VETRO 1 — testata ancorata: nome, cronometro, contatore, timer. */}
        <View
          style={styles.headerAnchor}
          pointerEvents="box-none"
          onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
        >
          {/* Il vetro si accende solo quando la lista degli esercizi gli scorre sotto. */}
          <GlassSurface cornerRadius={radius.xl} padding={spacing.md} activity={glassActivity}>
            <View style={styles.headerRow}>
              <Press
                style={styles.glassBtn}
                onPress={() => router.back()}
                accessibilityLabel="Chiudi allenamento"
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </Press>

              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {workout.name}
                </Text>
                <View style={styles.headerMeta}>
                  <Text style={[styles.stopwatch, tabular]}>{formatClock(elapsed)}</Text>
                  <Text style={styles.headerSep}>·</Text>
                  <Text style={[styles.headerCount, tabular]}>
                    {completedCount}/{totalSets} serie
                  </Text>
                </View>
              </View>

              <Press
                style={styles.glassBtn}
                onPress={() => setShowTimer(true)}
                accessibilityLabel="Apri il timer"
              >
                <Ionicons name="stopwatch-outline" size={22} color={colors.accent} />
              </Press>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          </GlassSurface>
        </View>

        {rest ? (
          <View style={[styles.restAnchor, { bottom: restLift }]} pointerEvents="box-none">
            <RestTimer
              seconds={rest.seconds}
              resetToken={rest.token}
              onFinish={() => setRest(null)}
              onSkip={() => setRest(null)}
            />
          </View>
        ) : null}

        {/* VETRO 2 — barra d'azione finale, sempre sotto il pollice. */}
        <View
          style={styles.barAnchor}
          pointerEvents="box-none"
          onLayout={(e) => setBarH(e.nativeEvent.layout.height)}
        >
          <GlassSurface cornerRadius={radius.xl} padding={spacing.md} activity={glassActivity}>
            <PrimaryButton
              label="COMPLETA ALLENAMENTO"
              variant="success"
              onPress={completeWorkout}
              loading={finishing}
            />
          </GlassSurface>
        </View>

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
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },

  // --- VETRO: testata ancorata in alto ---
  headerAnchor: {
    position: 'absolute',
    top: 0,
    left: spacing.md,
    right: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  glassBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  stopwatch: {
    // Cronometro di seduta: taglio arrotondato come ogni numero, e tabulare
    // (fontVariant applicato al punto d'uso) così le cifre non ballano.
    fontFamily: type.metric.fontFamily,
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerSep: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  headerCount: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.mint,
  },

  // --- VETRO: barra d'azione e recupero ---
  barAnchor: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
  },
  restAnchor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },

  // --- FERRO: card esercizio ---
  shell: {
    borderRadius: radius.lg,
    // L'unico strato di ferro della card sta qui: è anche la superficie che
    // porta l'alone del faro, e un'ombra su fondo trasparente non si vedrebbe.
    backgroundColor: IRON,
  },
  card: {
    // Trasparente di proposito: il ferro lo dà il guscio sottostante, così la
    // tinta non si somma due volte e il campo luminoso passa davvero.
    backgroundColor: 'transparent',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  /** L'unico faro della schermata: l'esercizio in corso. */
  cardBeacon: {
    borderColor: colors.accent,
  },
  topLight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    minHeight: 72,
  },
  index: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexDone: {
    backgroundColor: colors.mint,
  },
  indexText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '800',
  },
  indexTextDone: {
    color: colors.void,
  },
  headText: {
    flex: 1,
    gap: spacing.xs,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.raised,
  },
  statusDone: {
    backgroundColor: 'rgba(50,215,75,0.14)',
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  statusTextDone: {
    color: colors.mint,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },

  // --- Blocchi di riferimento dentro la card ---
  note: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: INNER,
    padding: spacing.md,
    backgroundColor: 'rgba(255,159,10,0.10)',
  },
  tip: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: INNER,
    padding: spacing.md,
    backgroundColor: 'rgba(100,210,255,0.10)',
  },
  blockIcon: {
    marginTop: 3,
  },
  blockText: {
    flex: 1,
  },
  reference: {
    borderRadius: INNER,
    padding: spacing.md,
    backgroundColor: colors.raised,
    gap: spacing.xs,
  },
  referenceValue: {
    color: colors.textPrimary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
    marginTop: spacing.xs,
  },

  // --- Riga di azioni compatte ---
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
    minHeight: 68,
    borderRadius: INNER,
    backgroundColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  actionDone: {
    backgroundColor: 'rgba(50,215,75,0.12)',
  },
  actionOpen: {
    backgroundColor: 'rgba(10,132,255,0.14)',
  },
  actionText: {
    color: colors.textSecondary,
  },
  actionTextDone: {
    color: colors.mint,
  },
  actionTextOpen: {
    color: colors.accent,
  },
  hidden: {
    display: 'none',
  },
});
