import type { CoachClient, NutritionDay, Program, ProgramWorkout } from '@wc/shared';
import { supabase } from './supabase';
import { todayDayOfWeek } from './utils';

function throwIf(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

/** ID dell'utente loggato (null se la sessione è scaduta). */
export async function getUserId(): Promise<string | null> {
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
