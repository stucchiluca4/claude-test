/**
 * Formule scientifiche condivise tra web e mobile.
 * Tenerle in un unico posto garantisce che coach e atleta
 * vedano SEMPRE gli stessi numeri.
 */

export type Sex = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'      // lavoro d'ufficio, poco movimento
  | 'light'          // 1-2 allenamenti/settimana
  | 'moderate'       // 3-4 allenamenti/settimana
  | 'active'         // 5-6 allenamenti/settimana
  | 'very_active';   // atleta / lavoro fisico + allenamenti

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Metabolismo basale (kcal/giorno) — formula Mifflin-St Jeor, standard clinico. */
export function calcBMR(params: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
}): number {
  const { sex, weightKg, heightCm, age } = params;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

/** Fabbisogno calorico totale giornaliero (kcal/giorno). */
export function calcTDEE(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity]);
}

/** Massimale stimato su 1 ripetizione — formula di Epley. */
export function estimate1RM(loadKg: number, reps: number): number {
  if (reps <= 0 || loadKg <= 0) return 0;
  if (reps === 1) return loadKg;
  return Math.round(loadKg * (1 + reps / 30) * 10) / 10;
}

/** Tonnellaggio di una serie (kg sollevati). */
export function setVolume(loadKg: number, reps: number): number {
  return Math.max(0, loadKg) * Math.max(0, reps);
}

/** Calorie a partire dai macronutrienti (4/4/9 kcal per grammo). */
export function macrosToKcal(macros: {
  proteinG: number;
  carbsG: number;
  fatG: number;
}): number {
  return Math.round(macros.proteinG * 4 + macros.carbsG * 4 + macros.fatG * 9);
}

/** Rapporto carboidrati:grassi (es. 4.2 significa "4,2 : 1").
 *  Restituisce null quando non è calcolabile (grassi a zero). */
export function carbFatRatio(carbsG: number, fatG: number): number | null {
  if (fatG <= 0) return null;
  return Math.round((carbsG / fatG) * 10) / 10;
}

/** Età a partire dalla data di nascita (stringa ISO `YYYY-MM-DD`). */
export function ageFromBirthDate(isoDate: string, today: Date = new Date()): number {
  // Niente `new Date(iso)`: verrebbe interpretata in UTC e confrontata con
  // getter locali, sbagliando di un giorno nei fusi a ovest di Greenwich.
  const [birthYear, birthMonth, birthDay] = isoDate.split('-').map(Number);
  let age = today.getFullYear() - birthYear;
  const m = today.getMonth() + 1 - birthMonth;
  if (m < 0 || (m === 0 && today.getDate() < birthDay)) age--;
  return Math.max(0, age);
}

/** Media settimanale kcal da una lista di giorni (per il riepilogo piano). */
export function weeklyAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

// ============================================================
// VALUTAZIONE CORPOREA (plicometria)
// ============================================================

/**
 * % di grasso corporeo stimata — Jackson-Pollock a 3 pliche + equazione di Siri.
 * Uomini: pettorale + addominale + coscia. Donne: tricipitale + sovrailiaca + coscia.
 * `sum3Mm` è la somma delle 3 pliche (media dx/sx, in millimetri).
 */
export function bodyFatJP3(params: { sex: Sex; age: number; sum3Mm: number }): number {
  const { sex, age, sum3Mm: s } = params;
  if (s <= 0 || age <= 0) return 0;
  const density =
    sex === 'male'
      ? 1.10938 - 0.0008267 * s + 0.0000016 * s * s - 0.0002574 * age
      : 1.0994921 - 0.0009929 * s + 0.0000023 * s * s - 0.0001392 * age;
  const bf = 495 / density - 450;
  return Math.round(Math.min(60, Math.max(2, bf)) * 10) / 10;
}

/** Le 3 pliche usate dalla formula JP3, per sesso. */
export const JP3_SITES: Record<Sex, string[]> = {
  male: ['pettorale', 'addominale', 'coscia'],
  female: ['tricipitale', 'sovrailiaca', 'coscia'],
};

/** Massa grassa e massa magra a partire da peso e % grasso. */
export function bodyComposition(weightKg: number, bodyFatPct: number) {
  const fatMassKg = Math.round(weightKg * (bodyFatPct / 100) * 10) / 10;
  return { fatMassKg, leanMassKg: Math.round((weightKg - fatMassKg) * 10) / 10 };
}

/** Metabolismo basale — Katch-McArdle (più preciso se conosci la massa magra). */
export function katchMcArdleBMR(leanMassKg: number): number {
  return Math.round(370 + 21.6 * leanMassKg);
}

/** Fattori PAL con etichette (per il TDEE = BMR × PAL). */
export const PAL_LEVELS = [
  { value: 1.2, label: 'Sedentario (niente sport)' },
  { value: 1.375, label: 'Leggermente attivo (1-2 allenamenti/settimana)' },
  { value: 1.55, label: 'Moderatamente attivo (3-5 allenamenti/settimana)' },
  { value: 1.725, label: 'Molto attivo (6-7 allenamenti/settimana)' },
  { value: 1.9, label: 'Atleta / lavoro fisico pesante' },
] as const;

/** TDEE da BMR e PAL numerico, con intervallo di confidenza ±150 kcal. */
export function tdeeFromPal(bmr: number, pal: number) {
  const tdee = Math.round(bmr * pal);
  return { tdee, rangeMin: tdee - 150, rangeMax: tdee + 150 };
}

// ============================================================
// PROGRESSIONI NUTRIZIONALI (bulk / cut / mantenimento)
// ============================================================

export type ProgressionMode = 'bulk' | 'cut' | 'maintenance';

export interface ProgressionInput {
  base: { proteinG: number; carbsG: number; fatG: number };
  mode: ProgressionMode;
  incrementType: 'percent' | 'grams';
  /** Incremento PER APPLICAZIONE (in % o in grammi, sempre positivo). */
  increments: { proteinG: number; carbsG: number; fatG: number };
  cadenceWeeks: number;
  durationWeeks: number;
}

export interface ProgressionWeek {
  week: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * Genera l'anteprima della progressione settimana per settimana.
 * bulk = incrementi positivi, cut = negativi, maintenance = nessuna variazione.
 */
export function progressionPreview(input: ProgressionInput): ProgressionWeek[] {
  const sign = input.mode === 'bulk' ? 1 : input.mode === 'cut' ? -1 : 0;
  const cadence = Math.max(1, input.cadenceWeeks);
  const weeks: ProgressionWeek[] = [];

  for (let week = 1; week <= input.durationWeeks; week++) {
    const applications = Math.floor((week - 1) / cadence);
    const apply = (base: number, inc: number) => {
      if (sign === 0 || applications === 0) return Math.round(base);
      if (input.incrementType === 'percent') {
        // Clamp a 0: un cut con incremento >= 100% non deve produrre negativi
        return Math.max(0, Math.round(base * Math.pow(Math.max(0, 1 + (sign * inc) / 100), applications)));
      }
      return Math.max(0, Math.round(base + sign * inc * applications));
    };
    const proteinG = apply(input.base.proteinG, input.increments.proteinG);
    const carbsG = apply(input.base.carbsG, input.increments.carbsG);
    const fatG = apply(input.base.fatG, input.increments.fatG);
    weeks.push({ week, proteinG, carbsG, fatG, kcal: macrosToKcal({ proteinG, carbsG, fatG }) });
  }
  return weeks;
}

// ============================================================
// RIEPILOGO ALLENAMENTO (record, punteggio, calorie, recupero)
// ============================================================

/** Migliori risultati di un esercizio nella seduta (per rilevare i record). */
export interface SessionBests {
  maxLoadKg: number | null;
  maxReps: number | null;
  maxSetVolumeKg: number | null;
  estimated1RM: number | null;
}

/** Estrae i migliori valori dalle serie completate di un esercizio. */
export function sessionBests(sets: { loadKg: number | null; reps: number | null }[]): SessionBests {
  let maxLoadKg: number | null = null;
  let maxReps: number | null = null;
  let maxSetVolumeKg: number | null = null;
  let estimated1RM: number | null = null;
  for (const s of sets) {
    if (s.loadKg != null && (maxLoadKg == null || s.loadKg > maxLoadKg)) maxLoadKg = s.loadKg;
    if (s.reps != null && (maxReps == null || s.reps > maxReps)) maxReps = s.reps;
    if (s.loadKg != null && s.reps != null) {
      const vol = setVolume(s.loadKg, s.reps);
      if (maxSetVolumeKg == null || vol > maxSetVolumeKg) maxSetVolumeKg = vol;
      const e1 = estimate1RM(s.loadKg, s.reps);
      if (estimated1RM == null || e1 > estimated1RM) estimated1RM = e1;
    }
  }
  return { maxLoadKg, maxReps, maxSetVolumeKg, estimated1RM };
}

/** Stima kcal di una seduta coi pesi (MET ≈ 6 per resistance training). */
export function workoutKcal(durationMin: number, weightKg: number): number {
  if (durationMin <= 0 || weightKg <= 0) return 0;
  return Math.round(((6 * 3.5 * weightKg) / 200) * durationMin);
}

export interface WorkoutScoreInput {
  /** Serie completate / serie prescritte (0..1). */
  completionRate: number;
  /** Nuovi record personali della seduta. */
  prCount: number;
  /** Volume seduta / volume della stessa seduta precedente (null = prima volta). */
  volumeRatio: number | null;
}

/**
 * Punteggio seduta 0-100, spiegabile: 60 punti dal completamento,
 * 20 dal trend di volume (≥ +10% = pieni), 20 dai record (10 l'uno).
 * Senza storico, il peso del trend ricade sul completamento.
 */
export function workoutScore(input: WorkoutScoreInput): number {
  const completion = Math.min(1, Math.max(0, input.completionRate));
  let score = 60 * completion;
  if (input.volumeRatio == null) {
    score += 20 * completion;
  } else {
    score += 20 * Math.min(1, Math.max(0, (input.volumeRatio - 0.9) / 0.2));
  }
  score += Math.min(20, Math.max(0, input.prCount) * 10);
  return Math.round(Math.min(100, score));
}

export interface RecoveryPrediction {
  hours: 24 | 36 | 48 | 72;
  label: string;
}

/** Previsione di recupero dai feedback della seduta (regole semplici e spiegabili). */
export function recoveryPrediction(params: {
  avgRpe: number | null;
  maxPain: number | null;
  tonnageKg: number;
}): RecoveryPrediction {
  const rpe = params.avgRpe ?? 6;
  const pain = params.maxPain ?? 1;
  let hours: RecoveryPrediction['hours'];
  if (pain >= 6 || rpe >= 8.5) hours = 72;
  else if (rpe >= 7 || params.tonnageKg >= 12000) hours = 48;
  else if (rpe >= 5) hours = 36;
  else hours = 24;
  const label =
    hours === 72
      ? 'Sforzo molto alto: recupera a fondo e segnala al coach eventuali dolori.'
      : hours === 48
        ? 'Sforzo importante: concediti un giorno pieno di recupero.'
        : hours === 36
          ? 'Buon lavoro: recupero standard prima di ricaricare questi muscoli.'
          : 'Seduta leggera: puoi riallenarti già domani.';
  return { hours, label };
}

// ============================================================
// ANALISI VOLUME SCHEDA (push / pull / gambe)
// ============================================================

export type PplCategory = 'push' | 'pull' | 'legs' | 'other';

/** Classifica un esercizio in Push / Pull / Gambe dal movimento o dal muscolo. */
export function classifyPPL(muscleGroup: string, mechanics?: string | null): PplCategory {
  const m = (mechanics ?? '').toLowerCase();
  if (m.startsWith('spinta')) return 'push';
  if (m.startsWith('trazione')) return 'pull';
  if (['squat', 'hinge', 'lunge'].includes(m)) return 'legs';

  const g = muscleGroup.toLowerCase();
  if (['petto', 'spalle', 'tricipiti'].includes(g)) return 'push';
  if (['dorso', 'bicipiti'].includes(g)) return 'pull';
  if (['quadricipiti', 'femorali', 'glutei', 'polpacci'].includes(g)) return 'legs';
  return 'other';
}
