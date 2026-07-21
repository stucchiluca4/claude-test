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

/**
 * Scale 1-10 del feedback per esercizio (atleta). `bands` descrive le fasce
 * 1-3 / 4-6 / 7-10 mostrate accanto al valore (usato da DotScale).
 */
export const FEEDBACK_SCALES = {
  rpe: { key: 'rpe', label: 'Sforzo percepito (RPE)', emoji: '🔥', bands: ['leggero', 'impegnativo', 'massimale'] },
  difficulty: { key: 'difficulty', label: 'Difficoltà', emoji: '🎯', bands: ['facile', 'giusta', 'troppo dura'] },
  energy: { key: 'energy', label: 'Energia', emoji: '⚡', bands: ['scarica', 'discreta', 'al top'] },
  pain: { key: 'pain', label: 'Dolore / fastidio', emoji: '🩹', bands: ['nessuno', 'un po’', 'forte'] },
} as const;

export type FeedbackMetric = keyof typeof FEEDBACK_SCALES;

/** Modalità dei timer di allenamento (lato atleta). */
export const TIMER_MODES = {
  countdown: { key: 'countdown', label: 'Countdown', emoji: '⏳', hint: 'Conto alla rovescia fino a zero.' },
  countup: { key: 'countup', label: 'Cronometro', emoji: '⏱', hint: 'Conta in avanti, fermi quando vuoi.' },
  emom: { key: 'emom', label: 'EMOM', emoji: '🔁', hint: 'A ogni intervallo parte un nuovo round.' },
  amrap: { key: 'amrap', label: 'AMRAP', emoji: '🔥', hint: 'Più round possibili nel tempo dato.' },
  hold: { key: 'hold', label: 'Isometria / Plank', emoji: '🧱', hint: 'Tieni la posizione; avviso al target.' },
} as const;

export type TimerMode = keyof typeof TIMER_MODES;

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

/**
 * Palette "Executive Control Room" — VINCOLANTE (docs/08-DESIGN-SYSTEM.md).
 * Corporate all-blue: navy per gli sfondi, Electric Blue per accenti/CTA/trend
 * positivi, avio per i grafici, celeste per bordi e dettagli, bianco puro solo
 * per testi e numeri KPI. Rosso/ambra ammessi solo come stati funzionali.
 */
export const COLORS = {
  background: '#070D1A',            // Blu Deep / Navy — sfondo dashboard
  card: '#0D1626',                  // contenitori dati
  cardGlass: 'rgba(16,20,30,0.65)', // pannelli in glassmorphism (web)
  border: 'rgba(186,224,255,0.12)', // bordi celeste sottili
  accent: '#38BDF8',                // Blu Primario (Electric) — CTA, stati attivi
  accentDeep: '#1D4ED8',            // estremo scuro dei gradienti Deep→Electric
  avio: '#2E6BE0',                  // Blu Medio — barre, elementi grafici standard
  celeste: '#9CD9FF',               // Light Blue — indicatori secondari
  success: '#38BDF8',               // trend positivi = Electric Blue (mai verde)
  warning: '#F59E0B',               // solo stato funzionale di avviso
  danger: '#EF4444',                // solo azioni distruttive / rischio
  textPrimary: '#FFFFFF',           // bianco puro: testi e numeri chiave
  textSecondary: '#8FA3C0',         // diciture di contorno
} as const;
