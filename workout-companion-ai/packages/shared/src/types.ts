/**
 * Tipi di dominio condivisi (rispecchiano le tabelle del database).
 * Se cambi lo schema SQL, aggiorna anche questi.
 */

export type UserRole = 'athlete' | 'coach' | 'gym_owner' | 'admin';
export type ClientStatus = 'invited' | 'active' | 'paused' | 'ended';
export type ProgramGoal =
  | 'strength'
  | 'hypertrophy'
  | 'fat_loss'
  | 'endurance'
  | 'general_fitness'
  | 'recomp';
export type ProgramStatus = 'draft' | 'active' | 'completed' | 'archived';
export type SetType = 'normal' | 'top_set' | 'back_off' | 'warmup' | 'dropset' | 'amrap';
export type DayType = 'training' | 'rest';
export type CheckinStatus = 'pending' | 'submitted' | 'reviewed';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';

export interface Profile {
  id: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  sex: 'male' | 'female' | 'other' | null;
  height_cm: number | null;
  locale: string;
  unit_system: 'metric' | 'imperial';
  onboarding_completed: boolean;
}

export interface CoachClient {
  id: string;
  coach_id: string;
  client_id: string | null;
  status: ClientStatus;
  invite_email: string | null;
  started_at: string | null;
  created_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: string | null;
  muscle_group: string;
  secondary_muscles: string[] | null;
  equipment: string | null;
  mechanics: string | null;
  video_url: string | null;
  image_url: string | null;
  instructions: string | null;
  is_public: boolean;
}

export interface Program {
  id: string;
  coach_client_id: string | null;
  created_by: string;
  name: string;
  goal: ProgramGoal;
  status: ProgramStatus;
  duration_weeks: number;
  start_date: string | null;
  notes: string | null;
  is_template: boolean;
}

export interface ExerciseSet {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  set_type: SetType;
  reps_min: number | null;
  reps_max: number | null;
  target_rpe: number | null;
  target_load_kg: number | null;
  rest_seconds: number | null;
  tempo: string | null;
}

export interface WorkoutExercise {
  id: string;
  program_workout_id: string;
  exercise_id: string;
  sort_order: number;
  method: SetType;
  superset_group: number | null;
  coach_notes: string | null;
  exercise?: Exercise;
  exercise_sets?: ExerciseSet[];
}

export interface ProgramWorkout {
  id: string;
  program_week_id: string;
  day_of_week: number;
  name: string;
  goal: string | null;
  estimated_duration_min: number | null;
  coach_notes: string | null;
  sort_order: number;
  workout_exercises?: WorkoutExercise[];
}

export interface SetLog {
  id: string;
  workout_log_id: string;
  workout_exercise_id: string | null;
  exercise_id: string;
  set_number: number;
  load_kg: number | null;
  reps: number | null;
  rpe: number | null;
  notes: string | null;
  completed: boolean;
  logged_at: string;
}

export interface WorkoutLog {
  id: string;
  program_workout_id: string | null;
  client_id: string;
  started_at: string;
  completed_at: string | null;
  duration_min: number | null;
  total_volume_kg: number | null;
  client_notes: string | null;
}

/** Tipi di record personale (tabella `personal_records`). */
export type RecordType = 'max_load' | 'max_reps' | 'max_volume' | 'estimated_1rm';

/** Record personale di un atleta su un esercizio. */
export interface PersonalRecord {
  id: string;
  client_id: string;
  exercise_id: string;
  record_type: RecordType;
  value: number;
  achieved_at: string;
  set_log_id: string | null;
  exercise?: Exercise;
}

/** Allegato foto/video di un esercizio eseguito (tabella `exercise_media`). */
export interface ExerciseMedia {
  id: string;
  workout_log_id: string;
  workout_exercise_id: string | null;
  exercise_id: string | null;
  storage_path: string;
  media_type: 'photo' | 'video';
  created_at: string;
}

/** Feedback dell'atleta su un esercizio eseguito (tabella `exercise_feedback`). */
export interface ExerciseFeedback {
  id: string;
  workout_log_id: string;
  workout_exercise_id: string;
  exercise_id: string | null;
  rpe: number | null;
  difficulty: number | null;
  energy: number | null;
  pain: number | null;
  notes: string | null;
  created_at: string;
}

export interface NutritionDay {
  id: string;
  nutrition_plan_id: string;
  week_number: number;
  day_of_week: number;
  day_type: DayType;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface Checkin {
  id: string;
  coach_client_id: string;
  week_start: string;
  status: CheckinStatus;
  weight_kg: number | null;
  sleep_quality: number | null;
  stress_level: number | null;
  energy_level: number | null;
  hunger_level: number | null;
  muscle_soreness: number | null;
  joint_stress: number | null;
  recovery: number | null;
  training_adherence: number | null;
  nutrition_adherence: number | null;
  avg_steps: number | null;
  client_notes: string | null;
  coach_feedback: string | null;
  submitted_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  attachment_path: string | null;
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
}

export interface Food {
  id: string;
  name: string;
  brand: string | null;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number | null;
}
