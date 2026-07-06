/** Liste condivise: la stessa terminologia ovunque nell'app. */

export const MUSCLE_GROUPS = [
  'petto',
  'dorso',
  'spalle',
  'bicipiti',
  'tricipiti',
  'quadricipiti',
  'femorali',
  'glutei',
  'polpacci',
  'core',
  'full body',
  'cardio',
] as const;

export const EXERCISE_CATEGORIES = [
  'multiarticolare',
  'isolamento',
  'cardio',
  'core',
  'mobilità',
] as const;

export const EQUIPMENT = [
  'bilanciere',
  'manubri',
  'macchina',
  'cavo',
  'corpo libero',
  'kettlebell',
  'elastici',
  'panca',
] as const;

export const PROGRAM_GOALS = {
  strength: 'Forza',
  hypertrophy: 'Ipertrofia',
  fat_loss: 'Dimagrimento',
  endurance: 'Endurance',
  general_fitness: 'Fitness generale',
  recomp: 'Ricomposizione',
} as const;

export const SET_TYPES = {
  normal: 'Normale',
  top_set: 'Top set',
  back_off: 'Back off',
  warmup: 'Riscaldamento',
  dropset: 'Dropset',
  amrap: 'AMRAP',
} as const;

export const DAYS_OF_WEEK = [
  'Lunedì',
  'Martedì',
  'Mercoledì',
  'Giovedì',
  'Venerdì',
  'Sabato',
  'Domenica',
] as const;

/** Piani di abbonamento (le chiavi corrispondono a `subscriptions.plan_key`). */
export const PLANS = {
  free: { label: 'Free', priceMonthly: 0, maxClients: 0 },
  athlete_pro: { label: 'Athlete Pro', priceMonthly: 9.99, maxClients: 0 },
  coach_starter: { label: 'Coach Starter', priceMonthly: 29, maxClients: 15 },
  coach_pro: { label: 'Coach Pro', priceMonthly: 69, maxClients: 50 },
  coach_elite: { label: 'Coach Elite', priceMonthly: 129, maxClients: Infinity },
  gym: { label: 'Gym/Team', priceMonthly: 249, maxClients: Infinity },
} as const;

export type PlanKey = keyof typeof PLANS;

/** Palette del design system (dark mode). */
export const COLORS = {
  background: '#0A0E17',
  card: '#111827',
  border: '#1F2937',
  accent: '#2563EB',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
} as const;
