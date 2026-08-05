'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Badge, GlassBar, buttonPrimary, inputClass } from '@/components/ui';
import { DAYS_OF_WEEK, SET_TYPES, PROGRAM_GOALS, classifyPPL } from '@wc/shared';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  GripVertical,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

/* Comandi che vivono sul livello VETRO: pillole a bordo capello. */
const buttonOnGlass =
  'press inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-4 text-[15px] font-semibold text-white transition hover:bg-white/[0.14] disabled:opacity-40 disabled:pointer-events-none';

/* Comando circolare sul vetro (indietro, settimana precedente/successiva). */
const iconOnGlass =
  'press grid shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.07] text-white transition hover:bg-white/[0.14] disabled:opacity-30 disabled:pointer-events-none';

/* Conferma: la menta è il colore di ciò che è compiuto. */
const buttonConfirm =
  'press inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-mint px-4 text-[15px] font-bold text-[#06120A] transition hover:brightness-110 disabled:opacity-45 disabled:pointer-events-none';

/* Etichette di colonna dell'editor: sempre la stessa voce. */
const columnLabel = 'text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary';

/* Campi tabulari della griglia serie: compatti ma con bersaglio da 40px. */
const cellField =
  'tnum h-10 w-full rounded-xs border border-transparent bg-raised px-2 text-center text-[15px] font-semibold text-white transition hover:border-white/10 focus:border-accent focus:outline-none';
const cellSelect =
  'h-10 w-full rounded-xs border border-transparent bg-raised px-2 text-[14px] font-semibold text-white transition hover:border-white/10 focus:border-accent focus:outline-none';

/* Sei colonne: serie · tipo · reps min · reps max · RPE · recupero */
const setsGrid = 'md:grid-cols-[3.5rem_minmax(8rem,1.25fr)_repeat(4,minmax(4.5rem,0.9fr))]';

const SET_COLUMNS = ['Serie', 'Tipo', 'Reps min', 'Reps max', 'RPE', 'Rec. (s)'] as const;

/** Sintesi della prescrizione: «4 × 8-10 @ RPE 8 · rec 120s». */
function setsSummary(sets: SetRow[]) {
  if (sets.length === 0) return null;
  const ordered = [...sets].sort((a, b) => a.set_number - b.set_number);
  const first = ordered[0];
  const reps =
    first.reps_min == null && first.reps_max == null
      ? '—'
      : first.reps_max == null || first.reps_min === first.reps_max
        ? String(first.reps_min ?? first.reps_max)
        : `${first.reps_min}-${first.reps_max}`;
  const mixed = ordered.some(
    (s) =>
      s.reps_min !== first.reps_min ||
      s.reps_max !== first.reps_max ||
      s.target_rpe !== first.target_rpe
  );
  return {
    scheme: `${sets.length} × ${reps}`,
    rpe: first.target_rpe,
    rest: first.rest_seconds,
    mixed,
  };
}

export function ProgramBuilder({ initialProgram }: { initialProgram: ProgramData }) {
  const router = useRouter();
  const supabase = createClient();
  const [program, setProgram] = useState(initialProgram);
  const [weekIdx, setWeekIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  /** Conferma effimera in menta dopo ogni scrittura andata a buon fine. */
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDay, setNewDay] = useState(1);
  const addTriggerRef = useRef<HTMLButtonElement>(null);

  const weeks = [...program.program_weeks].sort((a, b) => a.week_number - b.week_number);
  const week = weeks[weekIdx];

  /** "Salvato" resta visibile giusto il tempo di essere letto. */
  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 2600);
    return () => clearTimeout(t);
  }, [savedAt]);

  // Esc chiude il foglio "nuova sessione" e riporta il fuoco sul comando.
  useEffect(() => {
    if (!addOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setAddOpen(false);
        addTriggerRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [addOpen]);

  function markSaved() {
    setErrorMsg(null);
    setSavedAt(Date.now());
  }

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

  async function addWorkout(e: React.FormEvent) {
    e.preventDefault();
    // Guardia: senza settimane non c'è dove creare la sessione
    if (!week) return setErrorMsg('Il programma non ha settimane: impossibile aggiungere una sessione.');
    const name = newName.trim();
    if (!name) return;
    const day = Number(newDay);
    if (!day || day < 1 || day > 7) return;
    const { error } = await supabase
      .from('program_workouts')
      .insert({ program_week_id: week.id, name, day_of_week: day });
    if (error) return setErrorMsg('Creazione della sessione non riuscita: ' + error.message);
    markSaved();
    setAddOpen(false);
    setNewName('');
    await reload();
  }

  async function deleteWorkout(id: string) {
    if (!confirm('Eliminare questa sessione e tutti i suoi esercizi?')) return;
    const { error } = await supabase.from('program_workouts').delete().eq('id', id);
    if (error) return setErrorMsg('Eliminazione della sessione non riuscita: ' + error.message);
    markSaved();
    await reload();
  }

  async function addSet(wex: WexRow) {
    const last = wex.exercise_sets.at(-1);
    const { error } = await supabase.from('exercise_sets').insert({
      workout_exercise_id: wex.id,
      set_number: (last?.set_number ?? 0) + 1,
      set_type: last?.set_type ?? 'normal',
      reps_min: last?.reps_min ?? 8,
      reps_max: last?.reps_max ?? 10,
      target_rpe: last?.target_rpe ?? 8,
      rest_seconds: last?.rest_seconds ?? 120,
    });
    if (error) return setErrorMsg('Aggiunta della serie non riuscita: ' + error.message);
    markSaved();
    await reload();
  }

  async function updateSet(id: string, patch: Partial<SetRow>) {
    setSaving(true);
    const { error } = await supabase.from('exercise_sets').update(patch).eq('id', id);
    setSaving(false);
    if (error) return setErrorMsg('Salvataggio della serie non riuscito: ' + error.message);
    markSaved();
    // Aggiorna anche lo stato locale: "+ serie" e "Copia nella settimana
    // successiva" devono leggere i valori appena modificati, non quelli vecchi.
    setProgram((prev) => ({
      ...prev,
      program_weeks: prev.program_weeks.map((wk) => ({
        ...wk,
        program_workouts: wk.program_workouts.map((w) => ({
          ...w,
          workout_exercises: w.workout_exercises.map((wex) => ({
            ...wex,
            exercise_sets: wex.exercise_sets.map((s) => (s.id === id ? { ...s, ...patch } : s)),
          })),
        })),
      })),
    }));
  }

  async function deleteExercise(id: string) {
    if (!confirm('Rimuovere questo esercizio dalla sessione?')) return;
    const { error } = await supabase.from('workout_exercises').delete().eq('id', id);
    if (error) return setErrorMsg('Rimozione dell’esercizio non riuscita: ' + error.message);
    markSaved();
    await reload();
  }

  async function activateProgram() {
    const { error } = await supabase.from('programs').update({ status: 'active' }).eq('id', program.id);
    // Non mostrare "Attivo" se l'update è fallito
    if (error) return setErrorMsg('Attivazione del programma non riuscita: ' + error.message);
    markSaved();
    setProgram({ ...program, status: 'active' });
    router.refresh();
  }

  /** Copia tutte le sessioni della settimana corrente nella successiva. */
  async function copyWeekToNext() {
    // Guardia: senza settimane non c'è nulla da copiare
    if (!week) return setErrorMsg('Il programma non ha settimane: nulla da copiare.');
    const next = weeks[weekIdx + 1];
    if (!next) return alert('Questa è l’ultima settimana.');
    setSaving(true);
    const fail = (message: string) => {
      setSaving(false);
      setErrorMsg('Copia della settimana non riuscita: ' + message);
    };
    for (const w of week.program_workouts) {
      const { data: newWorkout, error: workoutError } = await supabase
        .from('program_workouts')
        .insert({
          program_week_id: next.id,
          day_of_week: w.day_of_week,
          name: w.name,
          coach_notes: w.coach_notes,
        })
        .select('id')
        .single();
      if (workoutError || !newWorkout) {
        return fail(workoutError?.message ?? 'sessione non creata');
      }
      for (const wex of w.workout_exercises) {
        const { data: newWex, error: wexError } = await supabase
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
        if (wexError || !newWex) {
          return fail(wexError?.message ?? 'esercizio non creato');
        }
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
        if (sets.length) {
          const { error: setsError } = await supabase.from('exercise_sets').insert(sets);
          if (setsError) return fail(setsError.message);
        }
      }
    }
    setSaving(false);
    markSaved();
    await reload();
    setWeekIdx(weekIdx + 1);
  }

  const workouts = [...(week?.program_workouts ?? [])].sort((a, b) => a.day_of_week - b.day_of_week);
  const isLastWeek = weekIdx >= weeks.length - 1;

  return (
    <div className="space-y-5">
      {/* ============ VETRO: la testata di comando, ancorata in alto ============ */}
      <GlassBar className="z-30 rounded-lg px-3.5 py-3 lg:sticky lg:top-6 lg:px-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link
              href="/allenamenti"
              aria-label="Torna a tutti i programmi"
              className={cn(iconOnGlass, 'h-11 w-11')}
            >
              <ArrowLeft size={18} aria-hidden />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="truncate text-[19px] font-bold tracking-[-0.01em] text-white">
                  {program.name}
                </h1>
                <Badge color={program.status === 'active' ? 'success' : 'warning'}>
                  {program.status === 'active' ? 'Attivo' : 'Bozza'}
                </Badge>
              </div>
              <p className="mt-0.5 truncate text-[13px] text-text-secondary">
                <span className="tnum">
                  {PROGRAM_GOALS[program.goal as keyof typeof PROGRAM_GOALS] ?? program.goal} ·{' '}
                  {program.duration_weeks} settimane
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Stato della scrittura: menta se salvato, rosa se rotto */}
            <span role="status" aria-live="polite" className="px-1 text-[13px] font-bold">
              {saving ? (
                <span className="inline-flex items-center gap-1.5 text-text-secondary">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden />
                  Salvataggio…
                </span>
              ) : errorMsg ? (
                <span className="inline-flex items-center gap-1.5 text-rose">
                  <AlertCircle size={14} aria-hidden />
                  Non salvato
                </span>
              ) : savedAt ? (
                <span className="inline-flex items-center gap-1.5 text-mint">
                  <Check size={14} aria-hidden />
                  Salvato
                </span>
              ) : null}
            </span>

            <button
              onClick={copyWeekToNext}
              className={buttonOnGlass}
              disabled={saving || isLastWeek || weeks.length === 0}
              title={isLastWeek ? 'Sei sull’ultima settimana del programma' : undefined}
            >
              <Copy size={16} aria-hidden />
              <span className="hidden sm:inline">Duplica settimana</span>
              <span className="sm:hidden">Duplica</span>
            </button>

            {/* Nuova sessione: foglio di controlli sul livello vetro */}
            <div className="relative">
              <button
                ref={addTriggerRef}
                type="button"
                onClick={() => setAddOpen(!addOpen)}
                aria-haspopup="dialog"
                aria-expanded={addOpen}
                className={cn(buttonPrimary, 'min-h-[44px] px-4 py-0')}
              >
                <Plus size={17} aria-hidden />
                Sessione
              </button>

              {addOpen && (
                <form
                  onSubmit={addWorkout}
                  role="dialog"
                  aria-label="Aggiungi una sessione alla settimana"
                  className="glass-chrome absolute right-0 z-40 mt-2 w-[20rem] max-w-[calc(100vw_-_2.5rem)] rounded-lg p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className={columnLabel}>
                      Nuova sessione · settimana {week?.week_number ?? '—'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setAddOpen(false);
                        addTriggerRef.current?.focus();
                      }}
                      aria-label="Chiudi il pannello"
                      className="press -mr-1.5 -mt-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-secondary transition hover:text-white"
                    >
                      <X size={16} aria-hidden />
                    </button>
                  </div>

                  <label htmlFor="workout-name" className={cn(columnLabel, 'mt-3.5 block')}>
                    Nome della sessione
                  </label>
                  <input
                    id="workout-name"
                    required
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className={cn(inputClass, 'mt-2')}
                    placeholder="Es. Pull Lower"
                  />

                  <label htmlFor="workout-day" className={cn(columnLabel, 'mt-3.5 block')}>
                    Giorno della settimana
                  </label>
                  <select
                    id="workout-day"
                    value={newDay}
                    onChange={(e) => setNewDay(Number(e.target.value))}
                    className={cn(inputClass, 'mt-2')}
                  >
                    {DAYS_OF_WEEK.map((d, i) => (
                      <option key={d} value={i + 1}>
                        {d}
                      </option>
                    ))}
                  </select>

                  <button type="submit" className={cn(buttonPrimary, 'mt-4 min-h-[44px] w-full')}>
                    Aggiungi alla settimana
                  </button>
                </form>
              )}
            </div>

            {program.status !== 'active' && (
              <button onClick={activateProgram} className={buttonConfirm}>
                <Check size={17} aria-hidden />
                <span className="hidden sm:inline">Attiva programma</span>
                <span className="sm:hidden">Attiva</span>
              </button>
            )}
          </div>
        </div>

        {/* Settimane: pillole selezionabili, scorrono da sole senza muovere la pagina */}
        {weeks.length > 0 && (
          <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
            <span className={cn(columnLabel, 'hidden shrink-0 pr-1 lg:block')} aria-hidden>
              Settimane
            </span>
            <button
              className={cn(iconOnGlass, 'h-10 w-10')}
              onClick={() => setWeekIdx(Math.max(0, weekIdx - 1))}
              disabled={weekIdx === 0}
              aria-label="Settimana precedente"
            >
              <ChevronLeft size={17} aria-hidden />
            </button>

            <div className="min-w-0 flex-1 overflow-x-auto">
              <div className="flex gap-1.5" role="group" aria-label="Settimane del programma">
                {weeks.map((w, i) => {
                  const sessions = w.program_workouts.length;
                  const selected = i === weekIdx;
                  return (
                    <button
                      key={w.id}
                      onClick={() => setWeekIdx(i)}
                      aria-pressed={selected}
                      aria-label={`Settimana ${w.week_number}${w.label ? ` · ${w.label}` : ''} · ${sessions} ${sessions === 1 ? 'sessione' : 'sessioni'}`}
                      title={w.label ?? undefined}
                      className={cn(
                        'press flex h-10 shrink-0 items-center gap-2 rounded-full pl-3.5 pr-2 text-[15px] font-bold transition',
                        selected
                          ? 'bg-accent text-white'
                          : 'border border-white/10 bg-white/[0.07] text-text-secondary hover:bg-white/[0.14] hover:text-white'
                      )}
                    >
                      <span className="tnum">S{w.week_number}</span>
                      <span
                        className={cn(
                          'tnum grid h-6 min-w-[1.5rem] place-items-center rounded-full px-1 text-[12px] font-bold',
                          selected
                            ? 'bg-white/20 text-white'
                            : sessions > 0
                              ? 'bg-mint/15 text-mint'
                              : 'bg-white/[0.06] text-text-tertiary'
                        )}
                        aria-hidden
                      >
                        {sessions}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              className={cn(iconOnGlass, 'h-10 w-10')}
              onClick={() => setWeekIdx(Math.min(weeks.length - 1, weekIdx + 1))}
              disabled={weekIdx >= weeks.length - 1}
              aria-label="Settimana successiva"
            >
              <ChevronRight size={17} aria-hidden />
            </button>
          </div>
        )}
      </GlassBar>

      {/* Banner errore: FERRO opaco, così il messaggio resta leggibile */}
      {errorMsg && (
        <div role="alert" className="iron flex items-start gap-3 rounded-md px-4 py-3.5 rise">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose" aria-hidden />
          <div className="min-w-0">
            <p className={cn(columnLabel, 'text-rose')}>Operazione non riuscita</p>
            <p className="mt-1 text-[15px] leading-snug text-white">{errorMsg}</p>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            aria-label="Chiudi l’avviso"
            className="press ml-auto -mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-secondary transition hover:text-white"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      )}

      {/* Riepilogo volume settimana */}
      {week && week.program_workouts.length > 0 && <VolumeSummary week={week} />}

      {/* Sessioni della settimana */}
      {weeks.length === 0 ? (
        <Card className="rise py-14 text-center">
          <p className="text-[17px] font-bold text-white">Questo programma non ha settimane</p>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-text-secondary">
            Ricrea la scheda dalla lista programmi: le settimane vuote vengono generate alla
            creazione.
          </p>
        </Card>
      ) : workouts.length === 0 ? (
        <Card className="rise py-14 text-center">
          <p className="text-[17px] font-bold text-white">
            Settimana {week?.week_number} ancora vuota
          </p>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-text-secondary">
            Aggiungi la prima sessione con «Sessione» qui sopra, oppure duplica la settimana
            precedente e ritocca i carichi.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {workouts.map((w, wi) => {
            const exercises = [...w.workout_exercises].sort((a, b) => a.sort_order - b.sort_order);
            const setCount = exercises.reduce((n, e) => n + e.exercise_sets.length, 0);
            return (
              <Card
                key={w.id}
                className={cn('overflow-hidden p-0 rise', wi < 5 && `rise-${wi + 1}`)}
              >
                {/* Testata della giornata */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cn(columnLabel, 'shrink-0 rounded-full bg-raised px-3 py-1.5')}>
                      {DAYS_OF_WEEK[w.day_of_week - 1] ?? `Giorno ${w.day_of_week}`}
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-[19px] font-bold tracking-[-0.01em] text-white">
                        {w.name}
                      </h2>
                      <p className="tnum mt-0.5 text-[13px] text-text-secondary">
                        {exercises.length} {exercises.length === 1 ? 'esercizio' : 'esercizi'} ·{' '}
                        {setCount} {setCount === 1 ? 'serie' : 'serie'}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <ExercisePicker
                      programWorkoutId={w.id}
                      nextSortOrder={
                        w.workout_exercises.reduce((max, e) => Math.max(max, e.sort_order), 0) + 1
                      }
                      onAdded={reload}
                    />
                    <button
                      onClick={() => deleteWorkout(w.id)}
                      className="press grid h-11 w-11 place-items-center rounded-full text-text-secondary transition hover:bg-raised hover:text-rose"
                      aria-label={`Elimina la sessione ${w.name}`}
                      title="Elimina sessione"
                    >
                      <Trash2 size={17} aria-hidden />
                    </button>
                  </div>
                </div>

                {exercises.length === 0 ? (
                  <p className="border-t border-line/60 px-6 py-8 text-center text-[15px] text-text-secondary">
                    Sessione vuota: aggiungi il primo esercizio dalla libreria con «Esercizio».
                  </p>
                ) : (
                  <ul>
                    {exercises.map((wex, i) => {
                      const summary = setsSummary(wex.exercise_sets);
                      return (
                        <li
                          key={wex.id}
                          className="border-t border-line/60 px-4 py-4 transition hover:bg-white/[0.015] sm:px-6"
                        >
                          {/* Riga esercizio: maniglia, nome, prescrizione, comandi */}
                          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5">
                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                              <span className="flex shrink-0 items-center gap-1" aria-hidden>
                                <GripVertical size={16} className="text-text-tertiary/70" />
                                <span className="tnum grid h-8 w-8 place-items-center rounded-full bg-raised text-[13px] font-bold text-white">
                                  {i + 1}
                                </span>
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-[17px] font-bold text-white">
                                  {wex.exercise.name}
                                </p>
                                <p className="mt-0.5 truncate text-[13px] capitalize text-text-secondary">
                                  {wex.exercise.muscle_group}
                                  {wex.exercise.equipment ? ` · ${wex.exercise.equipment}` : ''}
                                </p>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                              {summary && (
                                <span className="mr-1 hidden items-center gap-2 rounded-full bg-raised px-3 py-1.5 sm:inline-flex">
                                  <span className="tnum text-[13px] font-bold text-white">
                                    {summary.scheme}
                                  </span>
                                  {summary.mixed ? (
                                    <span className="text-[12px] font-semibold text-text-secondary">
                                      schema misto
                                    </span>
                                  ) : (
                                    summary.rpe != null && (
                                      <span
                                        className={cn(
                                          'tnum text-[12px] font-bold',
                                          summary.rpe >= 9 ? 'text-amber' : 'text-text-secondary'
                                        )}
                                      >
                                        RPE {summary.rpe}
                                      </span>
                                    )
                                  )}
                                  {summary.rest != null && (
                                    <span className="tnum hidden text-[12px] font-semibold text-text-tertiary lg:inline">
                                      rec {summary.rest}s
                                    </span>
                                  )}
                                </span>
                              )}
                              <button
                                onClick={() => addSet(wex)}
                                className="press inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[15px] font-semibold text-accent transition hover:bg-raised"
                                aria-label={`Aggiungi una serie a ${wex.exercise.name}`}
                              >
                                <Plus size={16} aria-hidden />
                                Serie
                              </button>
                              <button
                                onClick={() => deleteExercise(wex.id)}
                                className="press grid h-11 w-11 place-items-center rounded-full text-text-secondary transition hover:bg-raised hover:text-rose"
                                aria-label={`Rimuovi ${wex.exercise.name} dalla sessione`}
                                title="Rimuovi esercizio"
                              >
                                <Trash2 size={16} aria-hidden />
                              </button>
                            </div>
                          </div>

                          {/* Serie prescritte: griglia tabulare in un incasso più scuro */}
                          {wex.exercise_sets.length === 0 ? (
                            <p className="mt-3 rounded-md bg-background px-4 py-3 text-[13px] text-text-secondary">
                              Nessuna serie prescritta: premi «Serie» per aggiungerne una.
                            </p>
                          ) : (
                            <div className="mt-3 rounded-md bg-background p-2.5">
                              <div
                                className={cn(
                                  'hidden gap-2 px-1 pb-2 md:grid md:items-center',
                                  setsGrid
                                )}
                              >
                                {SET_COLUMNS.map((h, ci) => (
                                  <span key={h} className={cn(columnLabel, ci > 0 && 'text-center')}>
                                    {h}
                                  </span>
                                ))}
                              </div>

                              <ul className="space-y-2 md:space-y-1">
                                {[...wex.exercise_sets]
                                  .sort((a, b) => a.set_number - b.set_number)
                                  .map((s) => (
                                    <li
                                      key={s.id}
                                      className={cn(
                                        'grid grid-cols-2 gap-2 rounded-sm bg-white/[0.03] p-2.5 transition md:items-center md:rounded-xs md:bg-transparent md:p-1 md:hover:bg-white/[0.03]',
                                        setsGrid
                                      )}
                                    >
                                      <div className="col-span-2 flex items-center gap-2 md:col-span-1">
                                        <span className="tnum grid h-8 min-w-[2rem] place-items-center rounded-full bg-raised px-2 text-[13px] font-bold text-white md:h-10">
                                          {s.set_number}
                                        </span>
                                        <span className={cn(columnLabel, 'md:hidden')}>Serie</span>
                                      </div>

                                      <label className="col-span-2 flex flex-col gap-1 md:contents">
                                        <span className={cn(columnLabel, 'md:hidden')}>Tipo</span>
                                        <select
                                          defaultValue={s.set_type}
                                          onChange={(e) =>
                                            updateSet(s.id, { set_type: e.target.value })
                                          }
                                          aria-label={`Serie ${s.set_number}: tipo`}
                                          className={cellSelect}
                                        >
                                          {Object.entries(SET_TYPES).map(([k, v]) => (
                                            <option key={k} value={k}>
                                              {v}
                                            </option>
                                          ))}
                                        </select>
                                      </label>

                                      {(
                                        [
                                          ['reps_min', s.reps_min, 'Reps min'],
                                          ['reps_max', s.reps_max, 'Reps max'],
                                          ['target_rpe', s.target_rpe, 'RPE'],
                                          ['rest_seconds', s.rest_seconds, 'Rec. (s)'],
                                        ] as const
                                      ).map(([field, value, label]) => (
                                        <label
                                          key={field}
                                          className="flex flex-col gap-1 md:contents"
                                        >
                                          <span className={cn(columnLabel, 'md:hidden')}>
                                            {label}
                                          </span>
                                          <input
                                            type="number"
                                            inputMode="decimal"
                                            step={field === 'target_rpe' ? 0.5 : 1}
                                            defaultValue={value ?? ''}
                                            aria-label={`Serie ${s.set_number}: ${label}`}
                                            onBlur={(e) =>
                                              updateSet(s.id, {
                                                [field]:
                                                  e.target.value === ''
                                                    ? null
                                                    : Number(e.target.value),
                                              } as Partial<SetRow>)
                                            }
                                            className={cn(
                                              cellField,
                                              /* L'ambra è lo sforzo: un RPE da 9 in su si vede subito. */
                                              field === 'target_rpe' &&
                                                s.target_rpe != null &&
                                                s.target_rpe >= 9 &&
                                                'text-amber'
                                            )}
                                          />
                                        </label>
                                      ))}
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            );
          })}
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
  let totalExercises = 0;

  for (const w of week.program_workouts) {
    for (const wex of w.workout_exercises) {
      const sets = wex.exercise_sets.length;
      if (sets === 0) continue;
      totalSets += sets;
      totalExercises += 1;
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
  /* Scala delle barrette: il gruppo più allenato riempie la riga. */
  const maxLoad = muscles.reduce(
    (max, m) => Math.max(max, (direct[m] ?? 0) + (indirect[m] ?? 0)),
    0
  );

  if (totalSets === 0) return null;

  /* Range consigliati in ipertrofia: fuori range è un avviso, non un errore. */
  const balance = [
    { key: 'push', label: 'Spinta', sets: ppl.push, min: 40, max: 55, shade: 'bg-white/85' },
    { key: 'pull', label: 'Trazione', sets: ppl.pull, min: 30, max: 40, shade: 'bg-white/50' },
    { key: 'legs', label: 'Gambe', sets: ppl.legs, min: 15, max: 25, shade: 'bg-white/25' },
  ].map((b) => {
    const p = pct(b.sets);
    return { ...b, p, off: pplTotal > 0 && (p < b.min || p > b.max) };
  });

  return (
    /* IL FARO: è il numero che dice al coach se la settimana regge. */
    <Card beacon className="rise rise-2">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className={columnLabel}>
            Volume · settimana {week.week_number}
            {week.label ? ` · ${week.label}` : ''}
          </h2>
          <p className="tnum mt-1.5 text-[15px] text-text-secondary">
            {week.program_workouts.length}{' '}
            {week.program_workouts.length === 1 ? 'sessione' : 'sessioni'} · {totalExercises}{' '}
            {totalExercises === 1 ? 'esercizio' : 'esercizi'} · serie per gruppo muscolare, dirette e
            indirette.
          </p>
        </div>
        <div className="text-right">
          <div className="font-metric tnum text-[44px] font-extrabold leading-none text-amber">
            {totalSets}
          </div>
          <div className={cn(columnLabel, 'mt-1.5')}>serie totali</div>
        </div>
      </div>

      <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {muscles.map((m) => {
          const d = direct[m] ?? 0;
          const ind = indirect[m] ?? 0;
          const dw = maxLoad > 0 ? (d / maxLoad) * 100 : 0;
          const iw = maxLoad > 0 ? (ind / maxLoad) * 100 : 0;
          return (
            <li key={m} className="rounded-md bg-raised px-3.5 py-3">
              <div className="flex items-baseline gap-1.5">
                <span className="font-metric tnum text-[24px] font-extrabold leading-none text-white">
                  {d}
                </span>
                {ind > 0 && (
                  <span className="tnum text-[13px] font-semibold text-text-secondary">
                    +{ind} ind.
                  </span>
                )}
              </div>
              <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/[0.07]" aria-hidden>
                <span className="bg-white/80" style={{ width: `${dw}%` }} />
                <span className="bg-white/25" style={{ width: `${iw}%` }} />
              </div>
              <div className="mt-1.5 truncate text-[13px] capitalize text-text-secondary">{m}</div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2.5 text-[13px] text-text-tertiary">
        Il numero grande è il volume diretto; «ind.» sono le serie che il gruppo raccoglie come
        muscolo secondario.
      </p>

      <div className="mt-5 border-t border-line/60 pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className={columnLabel}>Bilanciamento spinta · trazione · gambe</h3>
          <p className="tnum text-[13px] text-text-secondary">
            Range ipertrofia: 40-55% · 30-40% · 15-25%
          </p>
        </div>

        {pplTotal > 0 ? (
          <>
            <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-raised" aria-hidden>
              {balance.map((b) => (
                <span key={b.key} className={b.shade} style={{ width: `${b.p}%` }} />
              ))}
            </div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-3">
              {balance.map((b) => (
                <li key={b.key} className="rounded-md bg-raised px-3.5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className={cn('h-2.5 w-2.5 shrink-0 rounded-sm', b.shade)} aria-hidden />
                    <span className="text-[15px] font-semibold text-white">{b.label}</span>
                    <span
                      className={cn(
                        'tnum ml-auto text-[17px] font-bold',
                        b.off ? 'text-amber' : 'text-white'
                      )}
                    >
                      {b.p}%
                    </span>
                    <span className="tnum text-[13px] text-text-secondary">({b.sets})</span>
                  </div>
                  <p className="tnum mt-1.5 flex items-center gap-1.5 pl-5 text-[12px] font-semibold text-text-tertiary">
                    {b.off && (
                      <AlertTriangle
                        size={13}
                        className="shrink-0 text-amber"
                        aria-label="Fuori dal range consigliato"
                      />
                    )}
                    <span className={cn(b.off && 'text-amber')}>
                      {b.off ? 'fuori range' : 'in range'} {b.min}-{b.max}%
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-3 text-[13px] text-text-secondary">
            Nessun esercizio classificato come spinta, trazione o gambe in questa settimana.
          </p>
        )}
      </div>
    </Card>
  );
}

/** Ricerca nella libreria esercizi e aggiunta alla sessione. */
function ExercisePicker({
  programWorkoutId,
  nextSortOrder,
  onAdded,
}: {
  programWorkoutId: string;
  nextSortOrder: number;
  onAdded: () => void;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [results, setResults] = useState<
    { id: string; name: string; muscle_group: string; equipment: string | null }[]
  >([]);
  // Id incrementale dell'ultima ricerca: le risposte arrivate fuori ordine vengono ignorate
  const searchReqId = useRef(0);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Esc chiude il foglio e riporta il fuoco sul comando che l'ha aperto.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function search(q: string) {
    setQuery(q);
    const reqId = ++searchReqId.current;
    if (q.length < 2) return setResults([]);
    const { data } = await supabase
      .from('exercises')
      .select('id, name, muscle_group, equipment')
      .ilike('name', `%${q}%`)
      .limit(8);
    if (reqId !== searchReqId.current) return; // risposta obsoleta
    setResults(data ?? []);
  }

  async function add(exerciseId: string) {
    // Aggiunge l'esercizio in coda alla sessione con 3 serie di default 8-10 reps @ RPE 8
    const { data: wex, error: wexError } = await supabase
      .from('workout_exercises')
      .insert({
        program_workout_id: programWorkoutId,
        exercise_id: exerciseId,
        sort_order: nextSortOrder,
      })
      .select('id')
      .single();
    if (wexError || !wex) {
      return setErrorMsg(
        'Aggiunta dell’esercizio non riuscita: ' + (wexError?.message ?? 'esercizio non creato')
      );
    }
    const { error: setsError } = await supabase.from('exercise_sets').insert(
      [1, 2, 3].map((n) => ({
        workout_exercise_id: wex.id,
        set_number: n,
        reps_min: 8,
        reps_max: 10,
        target_rpe: 8,
        rest_seconds: 120,
      }))
    );
    if (setsError) {
      return setErrorMsg('Creazione delle serie di default non riuscita: ' + setsError.message);
    }
    setErrorMsg(null);
    setOpen(false);
    setQuery('');
    setResults([]);
    onAdded();
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="press inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-raised px-4 text-[15px] font-semibold text-white transition hover:bg-[#252E3E]"
      >
        <Plus size={16} aria-hidden />
        Esercizio
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Cerca un esercizio nella libreria"
          className="glass-chrome absolute right-0 z-30 mt-2 w-[22rem] max-w-[calc(100vw_-_2.5rem)] rounded-lg p-3.5"
        >
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary"
              aria-hidden
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => search(e.target.value)}
              className={cn(inputClass, 'pl-10')}
              placeholder="Cerca esercizio… (min 2 lettere)"
              aria-label="Cerca esercizio nella libreria"
            />
          </div>

          {errorMsg && (
            <p
              role="alert"
              className="mt-2.5 flex items-start gap-2 rounded-xs bg-raised px-3 py-2.5 text-[13px] leading-snug text-rose"
            >
              <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
              {errorMsg}
            </p>
          )}

          <ul className="mt-2.5 max-h-72 space-y-1.5 overflow-y-auto">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => add(r.id)}
                  className="press flex min-h-[48px] w-full items-center gap-3 rounded-xs bg-raised px-3.5 py-2.5 text-left transition hover:bg-[#252E3E]"
                >
                  <Plus size={15} className="shrink-0 text-accent" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-white">
                      {r.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] capitalize text-text-secondary">
                      {r.muscle_group}
                      {r.equipment ? ` · ${r.equipment}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {query.length >= 2 && results.length === 0 && (
              <li className="rounded-xs bg-raised px-3.5 py-3 text-[13px] leading-snug text-text-secondary">
                Nessun risultato. Hai caricato la libreria esercizi? (supabase/seed)
              </li>
            )}
            {query.length < 2 && (
              <li className="rounded-xs bg-raised px-3.5 py-3 text-[13px] leading-snug text-text-secondary">
                Scrivi almeno due lettere: l’esercizio entra con 3 serie da 8-10 reps @ RPE 8, poi
                le ritocchi.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
