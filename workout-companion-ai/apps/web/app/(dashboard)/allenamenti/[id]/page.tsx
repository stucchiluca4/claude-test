import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProgramBuilder } from './program-builder';

export default async function ProgramPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: program } = await supabase
    .from('programs')
    .select(
      `id, name, goal, status, duration_weeks, notes,
       program_weeks (
         id, week_number, label,
         program_workouts (
           id, day_of_week, name, goal, estimated_duration_min, coach_notes, sort_order,
           workout_exercises (
             id, sort_order, method, coach_notes, exercise_id,
             exercise:exercises (id, name, muscle_group, equipment),
             exercise_sets (id, set_number, set_type, reps_min, reps_max, target_rpe, rest_seconds, tempo)
           )
         )
       )`
    )
    .eq('id', params.id)
    .single();

  if (!program) notFound();

  return <ProgramBuilder initialProgram={program as any} />;
}
