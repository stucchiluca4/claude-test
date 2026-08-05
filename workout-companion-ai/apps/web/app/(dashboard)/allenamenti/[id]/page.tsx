import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, CheckCircle2, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Badge, Card, GlassBar, KpiCard, buttonSecondary } from '@/components/ui';
import { cn } from '@/lib/utils';
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

/** Ritardi scalati per l'ingresso della fascia KPI (il ritardo va sulla Card interna). */
const KPI_DELAY = [
  '[&>div]:[animation-delay:0ms]',
  '[&>div]:[animation-delay:50ms]',
  '[&>div]:[animation-delay:100ms]',
  '[&>div]:[animation-delay:150ms]',
];

/** Prescrizione della demo, strutturata come nel builder: serie × reps @ RPE. */
type DemoExercise = { name: string; sets: number; reps: string; rpe?: number };
type DemoDay = { day: string; name: string; exercises: DemoExercise[] };

const DEMO_DAYS: DemoDay[] = [
  {
    day: 'Lunedì',
    name: 'Upper Strength',
    exercises: [
      { name: 'Panca piana', sets: 4, reps: '6', rpe: 8 },
      { name: 'Rematore bilanciere', sets: 4, reps: '8' },
      { name: 'Military press', sets: 3, reps: '8' },
      { name: 'Lat machine', sets: 3, reps: '10' },
    ],
  },
  {
    day: 'Mercoledì',
    name: 'Lower Hypertrophy',
    exercises: [
      { name: 'Squat', sets: 4, reps: '8' },
      { name: 'Romanian deadlift', sets: 3, reps: '10' },
      { name: 'Leg press', sets: 3, reps: '12' },
      { name: 'Calf raise', sets: 4, reps: '12' },
    ],
  },
  {
    day: 'Venerdì',
    name: 'Pull Volume',
    exercises: [
      { name: 'Trazioni', sets: 4, reps: 'AMRAP' },
      { name: 'Pulley', sets: 4, reps: '10' },
      { name: 'Face pull', sets: 3, reps: '15' },
      { name: 'Curl manubri', sets: 3, reps: '12' },
    ],
  },
];

function DemoProgramDetail({ id }: { id: string }) {
  const program = DEMO_PROGRAMS[id] ?? DEMO_PROGRAMS['demo-hypertrophy'];
  const days = DEMO_DAYS;

  const totalExercises = days.reduce((n, d) => n + d.exercises.length, 0);
  const totalSets = days.reduce(
    (n, d) => n + d.exercises.reduce((s, e) => s + e.sets, 0),
    0
  );

  const kpis: {
    label: string;
    value: string;
    delta?: string;
    deltaGood?: boolean;
    tone: 'neutral' | 'accent' | 'mint' | 'amber';
  }[] = [
    { label: 'Settimana', value: '5', delta: `di ${program.weeks} in programma`, deltaGood: true, tone: 'accent' },
    { label: 'Sessioni', value: String(days.length), delta: 'a settimana', deltaGood: true, tone: 'mint' },
    { label: 'Esercizi in scheda', value: String(totalExercises), tone: 'neutral' },
    { label: 'RPE di lavoro', value: '8', delta: 'overload controllato', tone: 'amber' },
  ];

  return (
    <div className="space-y-5">
      {/* ============ VETRO: la stessa testata di comando del builder ============ */}
      <GlassBar className="z-30 rounded-lg px-3.5 py-3 lg:sticky lg:top-6 lg:px-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link
              href="/allenamenti?demo=1"
              aria-label="Torna a tutti i programmi"
              className="press grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.07] text-white transition hover:bg-white/[0.14]"
            >
              <ArrowLeft size={18} aria-hidden />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[19px] font-bold tracking-[-0.01em] text-white">
                  {program.name}
                </h1>
                <Badge color="success">
                  <CheckCircle2 size={12} className="mr-1.5" aria-hidden />
                  Attivo
                </Badge>
                <Badge color="accent">Demo</Badge>
              </div>
              <p className="mt-0.5 truncate text-[13px] text-text-secondary">
                <span className="tnum">
                  {program.client} · {program.goal} · {program.weeks} settimane
                </span>
              </p>
            </div>
          </div>

          <Link href="/allenamenti?demo=1" className={cn(buttonSecondary, 'min-h-[44px] shrink-0')}>
            Tutti i programmi
          </Link>
        </div>
      </GlassBar>

      <section aria-label="Il punto della settimana" className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map((kpi, i) => (
          <div key={kpi.label} className={KPI_DELAY[i]}>
            <KpiCard
              label={kpi.label}
              value={kpi.value}
              delta={kpi.delta}
              deltaGood={kpi.deltaGood}
              tone={kpi.tone}
            />
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ---------- IL FARO: il microciclo che l'atleta sta eseguendo ---------- */}
        <Card beacon className="rise rise-3 p-0 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-4 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <CalendarDays size={19} className="shrink-0 text-text-secondary" aria-hidden />
                <h2 className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                  Microciclo corrente
                </h2>
              </div>
              <p className="mt-1.5 text-[17px] font-bold text-white">
                Settimana 5 · già consegnata all&apos;atleta
              </p>
            </div>
            <div className="text-right">
              <div className="font-metric tnum text-[40px] font-extrabold leading-none text-amber">
                {totalSets}
              </div>
              <div className="mt-1 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                serie in settimana
              </div>
            </div>
          </div>

          <ul className="border-t border-line/60">
            {days.map((day) => {
              const daySets = day.exercises.reduce((n, e) => n + e.sets, 0);
              return (
                <li key={day.day} className="border-b border-line/40 px-5 py-5 last:border-b-0 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="shrink-0 rounded-full bg-raised px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                        {day.day}
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-[19px] font-bold tracking-[-0.01em] text-white">
                          {day.name}
                        </h3>
                        <p className="tnum mt-0.5 text-[13px] text-text-secondary">
                          {day.exercises.length} esercizi · {daySets} serie
                        </p>
                      </div>
                    </div>
                    <Badge color="success">
                      <CheckCircle2 size={12} className="mr-1.5" aria-hidden />
                      Assegnato
                    </Badge>
                  </div>

                  <ul className="mt-3 space-y-1.5">
                    {day.exercises.map((exercise, i) => (
                      <li
                        key={exercise.name}
                        className="flex min-h-[48px] items-center gap-3 rounded-xs bg-raised px-3 py-2.5"
                      >
                        <span
                          className="tnum grid h-7 w-7 shrink-0 place-items-center rounded-full bg-card text-[13px] font-bold text-text-secondary"
                          aria-hidden
                        >
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-white">
                          {exercise.name}
                        </span>
                        <span className="tnum shrink-0 text-[15px] font-bold text-white">
                          {exercise.sets} × {exercise.reps}
                        </span>
                        {exercise.rpe != null && (
                          <span className="tnum shrink-0 rounded-full bg-amber/15 px-2 py-0.5 text-[12px] font-bold text-amber">
                            RPE {exercise.rpe}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card className="rise rise-4">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
              Struttura del blocco
            </h2>
            <dl className="mt-3 divide-y divide-line/50">
              {(
                [
                  ['Fase', 'Overload controllato'],
                  ['Settimana', `5 di ${program.weeks}`],
                  ['Frequenza', `${days.length} sessioni/settimana`],
                  ['Focus', 'Volume + tecnica'],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex min-h-[48px] items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <dt className="text-[15px] text-text-secondary">{label}</dt>
                  <dd className="tnum text-right text-[15px] font-semibold text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="rise rise-5">
            <div className="flex items-center gap-2.5">
              <FileText size={17} className="shrink-0 text-text-secondary" aria-hidden />
              <h2 className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                Note del coach
              </h2>
            </div>
            <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
              Mantieni RPE 8 sui fondamentali. Se la readiness scende sotto il 65%, taglia del 20% il
              volume accessorio e lascia intatti i multiarticolari.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
