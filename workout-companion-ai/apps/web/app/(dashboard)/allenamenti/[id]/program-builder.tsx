'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Badge, buttonPrimary, buttonSecondary, inputClass } from '@/components/ui';
import { DAYS_OF_WEEK, SET_TYPES, PROGRAM_GOALS, classifyPPL } from '@wc/shared';
import { ChevronLeft, ChevronRight, Plus, Trash2, Search } from 'lucide-react';

/* Tipi locali che rispecchiano la query del server */
interface SetRow {
  id: string;
  set_number: number;
  set_type: string;
  reps_min: number | null;
  reps_max: number | null;
  target_rpe: number | null;
  rest_seconds: number | null;
  tempo: string | null;
}
interface WexRow {
  id: string;
  sort_order: number;
  method: string;
  coach_notes: string | null;
  exercise_id: string;
  exercise: {
    id: string;
    name: string;
    muscle_group: string;
    secondary_muscles: string[] | null;
    equipment: string | null;
    mechanics: string | null;
  };
  exercise_sets: SetRow[];
}
interface WorkoutRow {
  id: string;
  day_of_week: number;
  name: string;
  coach_notes: string | null;
  workout_exercises: WexRow[];
}
interface WeekRow {
  id: string;
  week_number: number;
  label: string | null;
  program_workouts: WorkoutRow[];
}
interface ProgramData {
  id: string;
  name: string;
  goal: string;
  status: string;
  duration_weeks: number;
  program_weeks: WeekRow[];
}

export function ProgramBuilder({ initialProgram }: { initialProgram: ProgramData }) {
  const router = useRouter();
  const supabase = createClient();
  const [program, setProgram] = useState(initialProgram);
  const [weekIdx, setWeekIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  const weeks = [...program.program_weeks].sort((a, b) => a.week_number - b.week_number);
  const week = weeks[weekIdx];

  /** Ricarica il programma dal DB dopo ogni modifica (semplice e affidabile). */
  async function reload() {
    const { data } = await supabase
      .from('programs')
      .select(
        `id, name, goal, status, duration_weeks,
         program_weeks (id, week_number, label,
           program_workouts (id, day_of_week, name, coach_notes, sort_order,
             workout_exercises (id, sort_order, method, coach_notes, exercise_id,
               exercise:exercises (id, name, muscle_group, secondary_muscles, equipment, mechanics),
               exercise_sets (id, set_number, set_type, reps_min, reps_max, target_rpe, rest_seconds, tempo))))`
      )
      .eq('id', program.id)
      .single();
    if (data) setProgram(data as any);
  }

  async function addWorkout() {
    const name = prompt('Nome della sessione (es. "Pull Lower"):');
    if (!name) return;
    const day = Number(prompt('Giorno della settimana (1=Lunedì … 7=Domenica):', '1'));
    if (!day || day < 1 || day > 7) return;
    await supabase
      .from('program_workouts')
      .insert({ program_week_id: week.id, name, day_of_week: day });
    await reload();
  }

  async function deleteWorkout(id: string) {
    if (!confirm('Eliminare questa sessione e tutti i suoi esercizi?')) return;
    await supabase.from('program_workouts').delete().eq('id', id);
    await reload();
  }

  async function addSet(wex: WexRow) {
    const last = wex.exercise_sets.at(-1);
    await supabase.from('exercise_sets').insert({
      workout_exercise_id: wex.id,
      set_number: (last?.set_number ?? 0) + 1,
      set_type: last?.set_type ?? 'normal',
      reps_min: last?.reps_min ?? 8,
      reps_max: last?.reps_max ?? 10,
      target_rpe: last?.target_rpe ?? 8,
      rest_seconds: last?.rest_seconds ?? 120,
    });
    await reload();
  }

  async function updateSet(id: string, patch: Partial<SetRow>) {
    setSaving(true);
    await supabase.from('exercise_sets').update(patch).eq('id', id);
    setSaving(false);
  }

  async function deleteExercise(id: string) {
    if (!confirm('Rimuovere questo esercizio dalla sessione?')) return;
    await supabase.from('workout_exercises').delete().eq('id', id);
    await reload();
  }

  async function activateProgram() {
    await supabase.from('programs').update({ status: 'active' }).eq('id', program.id);
    setProgram({ ...program, status: 'active' });
    router.refresh();
  }

  /** Copia tutte le sessioni della settimana corrente nella successiva. */
  async function copyWeekToNext() {
    const next = weeks[weekIdx + 1];
    if (!next) return alert('Questa è l’ultima settimana.');
    setSaving(true);
    for (const w of week.program_workouts) {
      const { data: newWorkout } = await supabase
        .from('program_workouts')
        .insert({
          program_week_id: next.id,
          day_of_week: w.day_of_week,
          name: w.name,
          coach_notes: w.coach_notes,
        })
        .select('id')
        .single();
      if (!newWorkout) continue;
      for (const wex of w.workout_exercises) {
        const { data: newWex } = await supabase
          .from('workout_exercises')
          .insert({
            program_workout_id: newWorkout.id,
            exercise_id: wex.exercise_id,
            sort_order: wex.sort_order,
            method: wex.method,
            coach_notes: wex.coach_notes,
          })
          .select('id')
          .single();
        if (!newWex) continue;
        const sets = wex.exercise_sets.map((s) => ({
          workout_exercise_id: newWex.id,
          set_number: s.set_number,
          set_type: s.set_type,
          reps_min: s.reps_min,
          reps_max: s.reps_max,
          target_rpe: s.target_rpe,
          rest_seconds: s.rest_seconds,
          tempo: s.tempo,
        }));
        if (sets.length) await supabase.from('exercise_sets').insert(sets);
      }
    }
    setSaving(false);
    await reload();
    setWeekIdx(weekIdx + 1);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            {program.name}
            <Badge color={program.status === 'active' ? 'success' : 'default'}>
              {program.status === 'active' ? 'Attivo' : 'Bozza'}
            </Badge>
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            {PROGRAM_GOALS[program.goal as keyof typeof PROGRAM_GOALS] ?? program.goal} ·{' '}
            {program.duration_weeks} settimane {saving && '· salvataggio…'}
          </p>
        </div>
        {program.status !== 'active' && (
          <button onClick={activateProgram} className={buttonPrimary}>
            ✓ Attiva programma
          </button>
        )}
      </div>

      {/* Selettore settimana */}
      <div className="flex items-center gap-2 mb-5">
        <button
          className={buttonSecondary + ' !px-2.5'}
          onClick={() => setWeekIdx(Math.max(0, weekIdx - 1))}
          disabled={weekIdx === 0}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium px-2">
          Settimana {week?.week_number} di {weeks.length}
        </span>
        <button
          className={buttonSecondary + ' !px-2.5'}
          onClick={() => setWeekIdx(Math.min(weeks.length - 1, weekIdx + 1))}
          disabled={weekIdx >= weeks.length - 1}
        >
          <ChevronRight size={16} />
        </button>
        <button onClick={copyWeekToNext} className={buttonSecondary + ' ml-2'} disabled={saving}>
          ⧉ Copia nella settimana successiva
        </button>
        <button onClick={addWorkout} className={buttonPrimary + ' ml-auto'}>
          <Plus size={14} className="inline -mt-0.5" /> Aggiungi sessione
        </button>
      </div>

      {/* Riepilogo volume settimana */}
      {week && week.program_workouts.length > 0 && <VolumeSummary week={week} />}

      {/* Sessioni della settimana */}
      {week?.program_workouts.length === 0 ? (
        <Card className="text-center py-12 text-text-secondary text-sm">
          Nessuna sessione in questa settimana. Aggiungine una con il bottone qui sopra.
        </Card>
      ) : (
        <div className="space-y-5">
          {[...(week?.program_workouts ?? [])]
            .sort((a, b) => a.day_of_week - b.day_of_week)
            .map((w) => (
              <Card key={w.id}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">
                    {DAYS_OF_WEEK[w.day_of_week - 1]} — {w.name}
                  </h3>
                  <div className="flex gap-2">
                    <ExercisePicker programWorkoutId={w.id} onAdded={reload} />
                    <button
                      onClick={() => deleteWorkout(w.id)}
                      className="text-text-secondary hover:text-danger transition p-1.5"
                      title="Elimina sessione"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {[...w.workout_exercises]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((wex, i) => (
                    <div key={wex.id} className="border-t border-border py-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-accent/15 text-accent text-xs font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="font-medium">{wex.exercise.name}</span>
                          <span className="text-xs text-text-secondary">
                            {wex.exercise.muscle_group}
                            {wex.exercise.equipment ? ` · ${wex.exercise.equipment}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => addSet(wex)}
                            className="text-xs text-accent hover:underline"
                          >
                            + serie
                          </button>
                          <button
                            onClick={() => deleteExercise(wex.id)}
                            className="text-text-secondary hover:text-danger transition p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Tabella serie prescritte */}
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-text-secondary text-xs text-left">
                            <th className="py-1 font-medium w-12">SET</th>
                            <th className="py-1 font-medium">TIPO</th>
                            <th className="py-1 font-medium">REPS MIN</th>
                            <th className="py-1 font-medium">REPS MAX</th>
                            <th className="py-1 font-medium">RPE</th>
                            <th className="py-1 font-medium">RECUPERO (s)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...wex.exercise_sets]
                            .sort((a, b) => a.set_number - b.set_number)
                            .map((s) => (
                              <tr key={s.id}>
                                <td className="py-1 text-text-secondary">{s.set_number}</td>
                                <td className="py-1 pr-2">
                                  <select
                                    defaultValue={s.set_type}
                                    onChange={(e) => updateSet(s.id, { set_type: e.target.value })}
                                    className={inputClass + ' !py-1'}
                                  >
                                    {Object.entries(SET_TYPES).map(([k, v]) => (
                                      <option key={k} value={k}>
                                        {v}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                {(
                                  [
                                    ['reps_min', s.reps_min],
                                    ['reps_max', s.reps_max],
                                    ['target_rpe', s.target_rpe],
                                    ['rest_seconds', s.rest_seconds],
                                  ] as const
                                ).map(([field, value]) => (
                                  <td key={field} className="py-1 pr-2">
                                    <input
                                      type="number"
                                      step={field === 'target_rpe' ? 0.5 : 1}
                                      defaultValue={value ?? ''}
                                      onBlur={(e) =>
                                        updateSet(s.id, {
                                          [field]: e.target.value === '' ? null : Number(e.target.value),
                                        } as Partial<SetRow>)
                                      }
                                      className={inputClass + ' !py-1 w-20'}
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}

/**
 * Riepilogo volume della settimana: serie dirette/indirette per gruppo
 * muscolare + bilanciamento Push / Pull / Gambe.
 */
function VolumeSummary({ week }: { week: WeekRow }) {
  const direct: Record<string, number> = {};
  const indirect: Record<string, number> = {};
  const ppl: Record<string, number> = { push: 0, pull: 0, legs: 0, other: 0 };
  let totalSets = 0;

  for (const w of week.program_workouts) {
    for (const wex of w.workout_exercises) {
      const sets = wex.exercise_sets.length;
      if (sets === 0) continue;
      totalSets += sets;
      const mg = wex.exercise.muscle_group;
      direct[mg] = (direct[mg] ?? 0) + sets;
      for (const sec of wex.exercise.secondary_muscles ?? []) {
        indirect[sec] = (indirect[sec] ?? 0) + sets;
      }
      ppl[classifyPPL(mg, wex.exercise.mechanics)] += sets;
    }
  }

  const muscles = Array.from(new Set([...Object.keys(direct), ...Object.keys(indirect)])).sort(
    (a, b) => (direct[b] ?? 0) + (indirect[b] ?? 0) - ((direct[a] ?? 0) + (indirect[a] ?? 0))
  );
  const pplTotal = ppl.push + ppl.pull + ppl.legs;
  const pct = (n: number) => (pplTotal > 0 ? Math.round((n / pplTotal) * 100) : 0);

  if (totalSets === 0) return null;

  return (
    <Card className="mb-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">
          RIEPILOGO VOLUME{' '}
          <span className="text-text-secondary font-normal">(settimana · per gruppo muscolare)</span>
        </h3>
        <span className="text-sm">
          Totale: <b>{totalSets} serie</b>
        </span>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        {muscles.map((m) => (
          <div key={m} className="text-center">
            <div className="flex gap-1 justify-center">
              <span className="px-2 py-0.5 rounded-md bg-accent/20 text-accent text-xs font-bold tabular-nums">
                {direct[m] ?? 0}
              </span>
              {(indirect[m] ?? 0) > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-success/15 text-success text-xs font-bold tabular-nums">
                  {indirect[m]}
                </span>
              )}
            </div>
            <div className="text-xs text-text-secondary mt-1 capitalize">{m}</div>
          </div>
        ))}
        <div className="text-xs text-text-secondary self-end ml-auto">
          <span className="text-accent">■</span> dirette · <span className="text-success">■</span>{' '}
          indirette
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm border-t border-border pt-4">
        <span className="text-text-secondary text-xs uppercase tracking-wide">
          Bilanciamento
        </span>
        {(
          [
            ['Push', ppl.push, 'bg-danger'],
            ['Pull', ppl.pull, 'bg-accent'],
            ['Gambe', ppl.legs, 'bg-success'],
          ] as const
        ).map(([label, sets, color]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />
            {label} <b className="tabular-nums">{pct(sets)}%</b>
            <span className="text-text-secondary text-xs">({sets})</span>
          </span>
        ))}
        <span className="text-xs text-text-secondary ml-auto">
          Range ipertrofia consigliato: Push 40-55% · Pull 30-40% · Gambe 15-25%
        </span>
      </div>
    </Card>
  );
}

/** Ricerca nella libreria esercizi e aggiunta alla sessione. */
function ExercisePicker({
  programWorkoutId,
  onAdded,
}: {
  programWorkoutId: string;
  onAdded: () => void;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    { id: string; name: string; muscle_group: string; equipment: string | null }[]
  >([]);

  async function search(q: string) {
    setQuery(q);
    if (q.length < 2) return setResults([]);
    const { data } = await supabase
      .from('exercises')
      .select('id, name, muscle_group, equipment')
      .ilike('name', `%${q}%`)
      .limit(8);
    setResults(data ?? []);
  }

  async function add(exerciseId: string) {
    // Aggiunge l'esercizio con 3 serie di default 8-10 reps @ RPE 8
    const { data: wex } = await supabase
      .from('workout_exercises')
      .insert({ program_workout_id: programWorkoutId, exercise_id: exerciseId, sort_order: 99 })
      .select('id')
      .single();
    if (wex) {
      await supabase.from('exercise_sets').insert(
        [1, 2, 3].map((n) => ({
          workout_exercise_id: wex.id,
          set_number: n,
          reps_min: 8,
          reps_max: 10,
          target_rpe: 8,
          rest_seconds: 120,
        }))
      );
    }
    setOpen(false);
    setQuery('');
    setResults([]);
    onAdded();
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className={buttonSecondary + ' !py-1.5 text-xs'}>
        <Plus size={12} className="inline -mt-0.5" /> Esercizio
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 glass rounded-xl p-3 shadow-xl z-20">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-text-secondary" />
            <input
              autoFocus
              value={query}
              onChange={(e) => search(e.target.value)}
              className={inputClass + ' pl-8'}
              placeholder="Cerca esercizio… (min 2 lettere)"
            />
          </div>
          <ul className="mt-2 max-h-64 overflow-y-auto">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => add(r.id)}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-card-hover text-sm"
                >
                  {r.name}
                  <span className="text-xs text-text-secondary block">
                    {r.muscle_group}
                    {r.equipment ? ` · ${r.equipment}` : ''}
                  </span>
                </button>
              </li>
            ))}
            {query.length >= 2 && results.length === 0 && (
              <li className="text-xs text-text-secondary px-2.5 py-2">
                Nessun risultato. Hai caricato la libreria esercizi? (supabase/seed)
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
