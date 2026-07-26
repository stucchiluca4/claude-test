/**
 * MODALITÀ DEMO: permette di esplorare l'app atleta senza login né database,
 * con dati di esempio in memoria. Serve solo per provare le funzionalità.
 */
import type { Exercise, PersonalRecord, ProgramWorkout, SetLog, WorkoutExercise } from '@wc/shared';

let demo = false;
export const DEMO_UID = 'demo-athlete';

export function isDemo(): boolean {
  return demo;
}
export function setDemo(value: boolean): void {
  demo = value;
}

interface DemoExercise {
  id: string; // workout_exercise_id
  exerciseId: string;
  name: string;
  muscle: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  rpe: number;
  rest: number;
  lastLoad: number;
  lastReps: number;
  lastRpe: number;
}

const EXERCISES: DemoExercise[] = [
  { id: 'we-1', exerciseId: 'ex-squat', name: 'Squat con bilanciere', muscle: 'quadricipiti', sets: 3, repsMin: 6, repsMax: 8, rpe: 8, rest: 150, lastLoad: 80, lastReps: 8, lastRpe: 7 },
  { id: 'we-2', exerciseId: 'ex-panca', name: 'Panca piana', muscle: 'petto', sets: 3, repsMin: 6, repsMax: 10, rpe: 8, rest: 120, lastLoad: 60, lastReps: 6, lastRpe: 9 },
  { id: 'we-3', exerciseId: 'ex-rematore', name: 'Rematore manubrio', muscle: 'dorso', sets: 3, repsMin: 8, repsMax: 12, rpe: 8, rest: 90, lastLoad: 24, lastReps: 12, lastRpe: 7 },
];

/** Allenamento demo con esercizi e serie prescritte. */
export function demoWorkout(): ProgramWorkout {
  const workout_exercises: WorkoutExercise[] = EXERCISES.map((e, i) => ({
    id: e.id,
    program_workout_id: 'demo',
    exercise_id: e.exerciseId,
    sort_order: i,
    method: 'normal',
    superset_group: null,
    coach_notes: null,
    exercise: {
      id: e.exerciseId,
      name: e.name,
      category: null,
      muscle_group: e.muscle,
      secondary_muscles: null,
      equipment: null,
      mechanics: null,
      video_url: null,
      image_url: null,
      instructions: null,
      is_public: true,
    },
    exercise_sets: Array.from({ length: e.sets }, (_, s) => ({
      id: `${e.id}-set-${s + 1}`,
      workout_exercise_id: e.id,
      set_number: s + 1,
      set_type: 'normal' as const,
      reps_min: e.repsMin,
      reps_max: e.repsMax,
      target_rpe: e.rpe,
      target_load_kg: e.lastLoad,
      rest_seconds: e.rest,
      tempo: null,
    })),
  }));

  return {
    id: 'demo',
    program_week_id: 'demo-week',
    day_of_week: 1,
    name: 'Full Body A (demo)',
    goal: 'hypertrophy',
    estimated_duration_min: 60,
    coach_notes: 'Allenamento di esempio per provare l’app.',
    sort_order: 0,
    workout_exercises,
  };
}

/** Ultima performance finta per esercizio (per il consiglio di progressione). */
export function demoLastPerf(): Record<string, SetLog[]> {
  const out: Record<string, SetLog[]> = {};
  for (const e of EXERCISES) {
    out[e.exerciseId] = [
      {
        id: `${e.id}-last`,
        workout_log_id: 'demo-last',
        workout_exercise_id: e.id,
        exercise_id: e.exerciseId,
        set_number: 1,
        load_kg: e.lastLoad,
        reps: e.lastReps,
        rpe: e.lastRpe,
        notes: null,
        completed: true,
        logged_at: new Date().toISOString(),
      },
    ];
  }
  return out;
}

/** Biofeedback odierno finto (per la card "Prontezza di oggi"). */
export function demoBiofeedback() {
  return {
    recovery: 7,
    sleep_quality: 8,
    sleep_hours: 7.5,
    muscle_soreness: 3,
    stress_level: 3,
    weight_kg: 74.5,
    steps: 8200,
  };
}

/** Storico allenamenti finto (per la dashboard Progressi). */
export function demoWorkoutLogs(now: Date): { id: string; started_at: string; total_volume_kg: number }[] {
  const vols = [4200, 4600, 4400, 5000, 5200, 5100, 5600, 5800];
  return vols.map((v, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (vols.length - 1 - i) * 5);
    return { id: `demo-log-${i}`, started_at: d.toISOString(), total_volume_kg: v };
  });
}

function demoExerciseRef(id: string, name: string, muscle: string): Exercise {
  return {
    id,
    name,
    category: null,
    muscle_group: muscle,
    secondary_muscles: null,
    equipment: null,
    mechanics: null,
    video_url: null,
    image_url: null,
    instructions: null,
    is_public: true,
  };
}

/** Record personali finti (per la dashboard Progressi). */
export function demoPRs(): PersonalRecord[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    { id: 'pr-1', client_id: DEMO_UID, exercise_id: 'ex-squat', record_type: 'estimated_1rm', value: 105, achieved_at: today, set_log_id: null, exercise: demoExerciseRef('ex-squat', 'Squat con bilanciere', 'quadricipiti') },
    { id: 'pr-2', client_id: DEMO_UID, exercise_id: 'ex-panca', record_type: 'max_load', value: 62.5, achieved_at: today, set_log_id: null, exercise: demoExerciseRef('ex-panca', 'Panca piana', 'petto') },
    { id: 'pr-3', client_id: DEMO_UID, exercise_id: 'ex-rematore', record_type: 'max_reps', value: 14, achieved_at: today, set_log_id: null, exercise: demoExerciseRef('ex-rematore', 'Rematore manubrio', 'dorso') },
  ];
}

/** Serie della progressione di forza finta (1RM stimato per seduta). */
export function demoStrengthPoints(): { label: string; value: number; display: string }[] {
  const vals = [96, 98, 100, 101, 103, 105];
  return vals.map((v, i) => ({ label: `S${i + 1}`, value: v, display: String(v) }));
}
