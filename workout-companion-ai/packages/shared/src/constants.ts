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
 * Palette "Glass Over Iron" — VINCOLANTE (DESIGN.md).
 *
 * Due materiali mai mescolati: il FERRO (superfici opache) porta il contenuto,
 * il VETRO (traslucido, sfocato) porta solo i controlli. La saturazione vive
 * nei SEGNALI, e ogni segnale ha un solo significato in tutto il prodotto:
 * blu = azione · menta = fatto · ambra = sforzo · rosa = record ·
 * viola = AI · ciano = corpo.
 */
export const COLORS = {
  // --- Ferro: le superfici del contenuto (sempre opache) ---
  void: '#06080D',                  // il nero-blu dietro ogni cosa
  background: '#0C1017',            // fondo dell'app
  card: '#151A24',                  // card di contenuto
  surface: '#151A24',               // alias esplicito di `card`
  raised: '#1E2531',                // campi, righe selezionabili
  border: '#2A3241',                // divisori e bordi del livello ferro
  line: '#2A3241',                  // alias esplicito di `border`

  // --- Vetro: il livello dei controlli ---
  glassTint: 'rgba(22,28,38,0.62)', // tinta sotto la sfocatura
  glassBorder: 'rgba(255,255,255,0.08)',
  glassEdge: 'rgba(255,255,255,0.30)', // luce speculare sul bordo alto
  cardGlass: 'rgba(22,28,38,0.62)',    // compatibilità: usare glassTint

  // --- Segnali: il colore porta significato, non decorazione ---
  accent: '#0A84FF',                // Blu Segnale — azione, stato attivo
  blue: '#0A84FF',
  accentDeep: '#0060DF',            // pressione del blu
  mint: '#32D74B',                  // fatto, completato, confermato
  amber: '#FF9F0A',                 // sforzo, intensità, attenzione
  rose: '#FF375F',                  // record personali e azioni distruttive
  violet: '#BF5AF2',                // tutto ciò che è generato dall'AI
  cyan: '#64D2FF',                  // recupero, sonno, dati del corpo
  avio: '#3E8BFF',                  // blu medio per barre e grafici

  // --- Alias semantici storici (mantengono compatibile il codice esistente) ---
  celeste: '#64D2FF',
  success: '#32D74B',
  warning: '#FF9F0A',
  danger: '#FF375F',

  // --- Testo ---
  textPrimary: '#FFFFFF',           // numeri e testo primario, sempre pieno
  textSecondary: '#9BA6B8',         // testo secondario (7.8:1 sul fondo)
  textTertiary: '#7C8698',          // etichette e unità (5.0:1 su card: passa AA)

  // --- Macro: dati categoriali, NON segnali. Scala neutra per densità, così
  //     non rubano significato ai sei segnali (La Regola dei Macro Neutri). ---
  macroProtein: '#FFFFFF',
  macroCarbs: '#9BA6B8',
  macroFat: '#7C8698',
} as const;
