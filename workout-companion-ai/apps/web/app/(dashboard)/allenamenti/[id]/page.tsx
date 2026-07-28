import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Badge, Card, PageHeader } from '@/components/ui';
import { ProgramBuilder } from './program-builder';

export default async function ProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ demo?: string }>;
}) {
  const { id } = await params;
  const { demo } = await searchParams;

  if (demo === '1') {
    return <DemoProgramDetail id={id} />;
  }

  const supabase = await createClient();

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
             exercise:exercises (id, name, muscle_group, secondary_muscles, equipment, mechanics),
             exercise_sets (id, set_number, set_type, reps_min, reps_max, target_rpe, rest_seconds, tempo)
           )
         )
       )`
    )
    .eq('id', id)
    .single();

  if (!program) notFound();

  return <ProgramBuilder initialProgram={program as any} />;
}

const DEMO_PROGRAMS: Record<string, { name: string; client: string; goal: string; weeks: number }> = {
  'demo-hypertrophy': { name: 'Hypertrophy Engine W5', client: 'Marco Bellini', goal: 'Ipertrofia lean bulk', weeks: 8 },
  'demo-glute': { name: 'Glute Focus 12W', client: 'Giulia Rinaldi', goal: 'Ricomp + glute focus', weeks: 12 },
  'demo-strength': { name: 'Strength Reset', client: 'Andrea Costa', goal: 'Forza su squat', weeks: 6 },
};

function DemoProgramDetail({ id }: { id: string }) {
  const program = DEMO_PROGRAMS[id] ?? DEMO_PROGRAMS['demo-hypertrophy'];
  const days = [
    {
      day: 'Lunedi',
      name: 'Upper Strength',
      exercises: ['Panca piana 4x6 @RPE 8', 'Rematore bilanciere 4x8', 'Military press 3x8', 'Lat machine 3x10'],
    },
    {
      day: 'Mercoledi',
      name: 'Lower Hypertrophy',
      exercises: ['Squat 4x8', 'Romanian deadlift 3x10', 'Leg press 3x12', 'Calf raise 4x12'],
    },
    {
      day: 'Venerdi',
      name: 'Pull Volume',
      exercises: ['Trazioni 4xAMRAP', 'Pulley 4x10', 'Face pull 3x15', 'Curl manubri 3x12'],
    },
  ];

  return (
    <div>
      <PageHeader
        title={program.name}
        subtitle={`${program.client} - ${program.goal} - ${program.weeks} settimane`}
        actions={<Badge color="accent">Demo</Badge>}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <h3 className="font-semibold mb-4">Struttura programma</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-text-secondary">Fase</dt><dd>Overload controllato</dd></div>
            <div className="flex justify-between"><dt className="text-text-secondary">Settimana</dt><dd>5 di {program.weeks}</dd></div>
            <div className="flex justify-between"><dt className="text-text-secondary">Frequenza</dt><dd>4 workout/settimana</dd></div>
            <div className="flex justify-between"><dt className="text-text-secondary">Focus</dt><dd>Volume + tecnica</dd></div>
          </dl>
        </Card>
        <Card className="lg:col-span-2">
          <h3 className="font-semibold mb-4">Microciclo corrente</h3>
          <div className="space-y-4">
            {days.map((day) => (
              <div key={day.day} className="rounded-xl border border-border bg-background/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-text-secondary">{day.day}</p>
                    <h4 className="font-bold text-white">{day.name}</h4>
                  </div>
                  <Badge color="success">Assegnato</Badge>
                </div>
                <ul className="mt-3 grid gap-2 text-sm text-text-secondary md:grid-cols-2">
                  {day.exercises.map((exercise) => <li key={exercise}>{exercise}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-3">
          <h3 className="font-semibold mb-3">Note coach</h3>
          <p className="text-sm text-text-secondary">
            Mantieni RPE 8 sui fondamentali. Se readiness sotto 65%, riduci il volume accessorio del 20%.
          </p>
          <Link href="/allenamenti?demo=1" className="mt-4 inline-block text-sm text-accent hover:underline">
            Torna ai programmi
          </Link>
        </Card>
      </div>
    </div>
  );
}
