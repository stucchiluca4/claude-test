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

/** Rapporto carboidrati:grassi (es. 4.2 significa "4,2 : 1"). */
export function carbFatRatio(carbsG: number, fatG: number): number {
  if (fatG <= 0) return 0;
  return Math.round((carbsG / fatG) * 10) / 10;
}

/** Età a partire dalla data di nascita (stringa ISO `YYYY-MM-DD`). */
export function ageFromBirthDate(isoDate: string, today: Date = new Date()): number {
  const birth = new Date(isoDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return Math.max(0, age);
}

/** Media settimanale kcal da una lista di giorni (per il riepilogo piano). */
export function weeklyAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}
