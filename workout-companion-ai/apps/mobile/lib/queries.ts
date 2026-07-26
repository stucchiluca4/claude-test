import type {
  CoachClient,
  ExerciseFeedback,
  ExerciseMedia,
  NutritionDay,
  Program,
  ProgramWorkout,
  RecordType,
} from '@wc/shared';
import { supabase } from './supabase';
import { todayDayOfWeek } from './utils';
import { DEMO_UID, isDemo } from './demo';

const WORKOUT_MEDIA_BUCKET = 'workout-media';

function throwIf(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

/** ID dell'utente loggato (null se la sessione è scaduta). In demo, un id fittizio. */
export async function getUserId(): Promise<string | null> {
  if (isDemo()) return DEMO_UID;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Relazione coach-cliente attiva dell'atleta loggato. */
export async function getActiveCoachClient(userId: string): Promise<CoachClient | null> {
  const { data, error } = await supabase
    .from('coach_clients')
    .select('*')
    .eq('client_id', userId)
    .in('status', ['active', 'paused'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIf(error);
  return (data as CoachClient | null) ?? null;
}

/** Programma di allenamento attivo per la relazione coach-cliente. */
export async function getActiveProgram(coachClientId: string): Promise<Program | null> {
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('coach_client_id', coachClientId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIf(error);
  return (data as Program | null) ?? null;
}

/**
 * Settimana corrente del piano in base a start_date.
 * Senza data di inizio (o fuori range) si resta su un valore valido.
 */
export function currentWeekNumber(plan: { start_date: string | null; duration_weeks: number }): number {
  if (!plan.start_date) return 1;
  const start = new Date(`${plan.start_date}T00:00:00`);
  const days = Math.floor((Date.now() - start.getTime()) / 86_400_000);
  const week = Math.floor(days / 7) + 1;
  return Math.min(Math.max(week, 1), Math.max(plan.duration_weeks, 1));
}

/** Allenamenti prescritti per una settimana del programma, ordinati per giorno. */
export async function getWeekWorkouts(programId: string, weekNumber: number): Promise<ProgramWorkout[]> {
  const { data, error } = await supabase
    .from('program_weeks')
    .select('id, week_number, program_workouts(*)')
    .eq('program_id', programId)
    .eq('week_number', weekNumber)
    .maybeSingle();
  throwIf(error);
  const workouts = ((data as { program_workouts?: ProgramWorkout[] } | null)?.program_workouts ?? []) as ProgramWorkout[];
  return [...workouts].sort((a, b) => a.day_of_week - b.day_of_week || a.sort_order - b.sort_order);
}

/** Riga della tabella `daily_biofeedback` (check giornaliero dell'atleta). */
export interface DailyBiofeedback {
  id: string;
  coach_client_id: string;
  log_date: string;
  sleep_quality: number | null;
  sleep_hours: number | null;
  stress_level: number | null;
  energy_level: number | null;
  muscle_soreness: number | null;
  joint_stress: number | null;
  recovery: number | null;
  carbs_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
  kcal_consumed: number | null;
  hydration_l: number | null;
  steps: number | null;
  weight_kg: number | null;
  notes: string | null;
}

/** Dati modificabili di un check giornaliero (id escluso: pensato per l'upsert). */
export type DailyBiofeedbackInput = Partial<Omit<DailyBiofeedback, 'id'>> & {
  coach_client_id: string;
  log_date: string;
};

/** Check giornalieri in un intervallo di date incluse (`YYYY-MM-DD`). */
export async function getBiofeedbackBetween(
  coachClientId: string,
  fromDate: string,
  toDate: string,
): Promise<DailyBiofeedback[]> {
  const { data, error } = await supabase
    .from('daily_biofeedback')
    .select('*')
    .eq('coach_client_id', coachClientId)
    .gte('log_date', fromDate)
    .lte('log_date', toDate)
    .order('log_date', { ascending: true });
  throwIf(error);
  return ((data ?? []) as DailyBiofeedback[]);
}

/** Check giornaliero di una data specifica (`YYYY-MM-DD`), se esiste. */
export async function getBiofeedbackByDate(
  coachClientId: string,
  logDate: string,
): Promise<DailyBiofeedback | null> {
  const { data, error } = await supabase
    .from('daily_biofeedback')
    .select('*')
    .eq('coach_client_id', coachClientId)
    .eq('log_date', logDate)
    .maybeSingle();
  throwIf(error);
  return (data as DailyBiofeedback | null) ?? null;
}

/**
 * Inserisce o aggiorna il check giornaliero (chiave: coach_client_id + log_date).
 * Vengono toccate solo le colonne presenti nel payload.
 */
export async function upsertDailyBiofeedback(row: DailyBiofeedbackInput): Promise<void> {
  const { error } = await supabase
    .from('daily_biofeedback')
    .upsert(row, { onConflict: 'coach_client_id,log_date' });
  throwIf(error);
}

/** Campi modificabili del feedback per esercizio (per l'upsert). */
export interface ExerciseFeedbackInput {
  workout_log_id: string;
  workout_exercise_id: string;
  exercise_id: string | null;
  rpe?: number | null;
  difficulty?: number | null;
  energy?: number | null;
  pain?: number | null;
  notes?: string | null;
}

/** Tutti i feedback per esercizio di una seduta (per ripristinare la UI). */
export async function getExerciseFeedbackForLog(workoutLogId: string): Promise<ExerciseFeedback[]> {
  const { data, error } = await supabase
    .from('exercise_feedback')
    .select('*')
    .eq('workout_log_id', workoutLogId);
  throwIf(error);
  return (data ?? []) as ExerciseFeedback[];
}

/**
 * Inserisce o aggiorna il feedback di un esercizio della seduta
 * (chiave: workout_log_id + workout_exercise_id).
 */
export async function upsertExerciseFeedback(row: ExerciseFeedbackInput): Promise<ExerciseFeedback> {
  const { data, error } = await supabase
    .from('exercise_feedback')
    .upsert(
      { ...row, updated_at: new Date().toISOString() },
      { onConflict: 'workout_log_id,workout_exercise_id' },
    )
    .select('*')
    .single();
  throwIf(error);
  return data as ExerciseFeedback;
}

export interface ExerciseMediaWithUrl extends ExerciseMedia {
  url: string | null;
}

/** Allegati di una seduta con URL firmati temporanei (bucket privato). */
export async function getExerciseMediaForLog(workoutLogId: string): Promise<ExerciseMediaWithUrl[]> {
  const { data, error } = await supabase
    .from('exercise_media')
    .select('*')
    .eq('workout_log_id', workoutLogId)
    .order('created_at', { ascending: false });
  throwIf(error);
  const rows = (data ?? []) as ExerciseMedia[];
  if (rows.length === 0) return [];

  const { data: signed } = await supabase.storage
    .from(WORKOUT_MEDIA_BUCKET)
    .createSignedUrls(rows.map((r) => r.storage_path), 3600);
  const urlByPath = new Map((signed ?? []).map((s) => [s.path ?? '', s.signedUrl]));
  return rows.map((r) => ({ ...r, url: urlByPath.get(r.storage_path) ?? null }));
}

/** Carica una foto/video nel bucket privato e registra la riga in exercise_media. */
export async function uploadExerciseMedia(params: {
  clientId: string;
  workoutLogId: string;
  workoutExerciseId: string;
  exerciseId: string;
  uri: string;
  mediaType: 'photo' | 'video';
}): Promise<void> {
  const ext = (params.uri.split('?')[0].split('.').pop() || (params.mediaType === 'photo' ? 'jpg' : 'mp4')).toLowerCase();
  const path = `${params.clientId}/${params.workoutLogId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  const contentType = params.mediaType === 'photo' ? 'image/jpeg' : 'video/mp4';

  const resp = await fetch(params.uri);
  const blob = await resp.blob();

  const { error: uploadError } = await supabase.storage
    .from(WORKOUT_MEDIA_BUCKET)
    .upload(path, blob, { contentType, upsert: false });
  throwIf(uploadError);

  const { error: insertError } = await supabase.from('exercise_media').insert({
    workout_log_id: params.workoutLogId,
    workout_exercise_id: params.workoutExerciseId,
    exercise_id: params.exerciseId,
    storage_path: path,
    media_type: params.mediaType,
  });
  throwIf(insertError);
}

/** Rimuove un allegato: prima il file, poi la riga. */
export async function deleteExerciseMedia(item: ExerciseMedia): Promise<void> {
  await supabase.storage.from(WORKOUT_MEDIA_BUCKET).remove([item.storage_path]);
  const { error } = await supabase.from('exercise_media').delete().eq('id', item.id);
  throwIf(error);
}

/** Miglior valore di seduta per un tipo di record, con la serie che l'ha prodotto. */
export interface PrCandidateBest {
  value: number;
  setLogId: string | null;
}

/** Candidati record di un esercizio al termine della seduta. */
export interface ExercisePrCandidate {
  exercise_id: string;
  bests: Partial<Record<RecordType, PrCandidateBest>>;
}

/**
 * Confronta i migliori valori della seduta con i record storici dell'atleta
 * e salva SOLO i miglioramenti (upsert su client+esercizio+tipo).
 * Ritorna il numero di nuovi record stabiliti.
 */
export async function savePersonalRecords(
  clientId: string,
  candidates: ExercisePrCandidate[],
  achievedAt: string,
): Promise<number> {
  const exerciseIds = candidates.map((c) => c.exercise_id);
  if (exerciseIds.length === 0) return 0;

  const { data, error } = await supabase
    .from('personal_records')
    .select('exercise_id, record_type, value')
    .eq('client_id', clientId)
    .in('exercise_id', exerciseIds);
  throwIf(error);

  const current = new Map<string, number>();
  for (const r of (data ?? []) as { exercise_id: string; record_type: RecordType; value: number }[]) {
    current.set(`${r.exercise_id}:${r.record_type}`, Number(r.value));
  }

  const rows: {
    client_id: string;
    exercise_id: string;
    record_type: RecordType;
    value: number;
    achieved_at: string;
    set_log_id: string | null;
  }[] = [];
  for (const c of candidates) {
    for (const [type, best] of Object.entries(c.bests) as [RecordType, PrCandidateBest | undefined][]) {
      if (!best || !(best.value > 0)) continue;
      const prev = current.get(`${c.exercise_id}:${type}`);
      if (prev == null || best.value > prev) {
        rows.push({
          client_id: clientId,
          exercise_id: c.exercise_id,
          record_type: type,
          value: best.value,
          achieved_at: achievedAt,
          set_log_id: best.setLogId,
        });
      }
    }
  }
  if (rows.length === 0) return 0;

  const { error: upsertError } = await supabase
    .from('personal_records')
    .upsert(rows, { onConflict: 'client_id,exercise_id,record_type' });
  throwIf(upsertError);
  return rows.length;
}

/**
 * Giorno nutrizionale di oggi per il piano attivo.
 * Se la settimana corrente non è definita nel piano si ripiega sulla settimana 1.
 */
export async function getTodayNutritionDay(coachClientId: string): Promise<NutritionDay | null> {
  const { data: plan, error } = await supabase
    .from('nutrition_plans')
    .select('id, start_date, duration_weeks')
    .eq('coach_client_id', coachClientId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIf(error);
  if (!plan) return null;

  const week = currentWeekNumber(plan as { start_date: string | null; duration_weeks: number });
  const dow = todayDayOfWeek();

  for (const weekNumber of week === 1 ? [1] : [week, 1]) {
    const { data: day, error: dayError } = await supabase
      .from('nutrition_days')
      .select('*')
      .eq('nutrition_plan_id', (plan as { id: string }).id)
      .eq('week_number', weekNumber)
      .eq('day_of_week', dow)
      .maybeSingle();
    throwIf(dayError);
    if (day) return day as NutritionDay;
  }
  return null;
}
