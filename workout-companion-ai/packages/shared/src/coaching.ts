/**
 * Motore di coaching DETERMINISTICO: trasforma i dati in AZIONI concrete
 * (a differenza di insights.ts che fa osservazioni). Nessun LLM.
 */

export type Readiness = 'go_hard' | 'normal' | 'easy' | 'rest';

export interface ReadinessResult {
  level: Readiness;
  emoji: string;
  label: string;
  advice: string;
  /** Moltiplicatore di volume consigliato per la seduta (1 = come da piano). */
  volumeFactor: number;
}

/**
 * Prontezza del giorno dal biofeedback (scale 1-10). Combina recupero, sonno,
 * dolori muscolari e stress (questi ultimi invertiti). Ritorna null senza dati.
 */
export function readinessFromBiofeedback(
  b: { recovery?: number | null; sleep_quality?: number | null; muscle_soreness?: number | null; stress_level?: number | null } | null,
): ReadinessResult | null {
  if (!b) return null;
  let score = 0;
  let n = 0;
  const add = (v: number | null | undefined, invert = false) => {
    if (v == null || !Number.isFinite(v)) return;
    score += invert ? 11 - v : v;
    n += 1;
  };
  add(b.recovery);
  add(b.sleep_quality);
  add(b.muscle_soreness, true);
  add(b.stress_level, true);
  if (n === 0) return null;
  const avg = score / n;

  if (avg >= 7.5)
    return {
      level: 'go_hard',
      emoji: '🚀',
      label: 'Pronto a spingere',
      advice: 'Recupero ottimo: oggi puoi cercare il carico o le ripetizioni in più.',
      volumeFactor: 1.1,
    };
  if (avg >= 5.5)
    return {
      level: 'normal',
      emoji: '👍',
      label: 'Giornata normale',
      advice: 'Recupero nella media: allenati come da programma.',
      volumeFactor: 1,
    };
  if (avg >= 4)
    return {
      level: 'easy',
      emoji: '🐢',
      label: 'Vacci piano',
      advice: 'Recupero basso: mantieni i carichi ma riduci il volume ed evita il cedimento.',
      volumeFactor: 0.75,
    };
  return {
    level: 'rest',
    emoji: '🛌',
    label: 'Meglio recuperare',
    advice: 'Segnali di stanchezza marcati: valuta riposo attivo o una seduta leggera.',
    volumeFactor: 0.5,
  };
}

export interface LoadProgressionInput {
  lastLoadKg: number | null;
  lastReps: number | null;
  lastRpe: number | null;
  targetRpe: number | null;
  repsMax: number | null;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
/** Incremento minimo sensato di carico in base all'entità del peso. */
const loadStep = (loadKg: number): number => (loadKg >= 40 ? 2.5 : loadKg >= 20 ? 1.25 : 1);

/**
 * Suggerimento per la prossima esecuzione di un esercizio, dall'ultima
 * performance: autoregolazione su RPE + doppia progressione (carico/reps).
 * Ritorna null se mancano i dati minimi.
 */
export function loadSuggestion(input: LoadProgressionInput): string | null {
  const { lastLoadKg, lastReps, lastRpe, targetRpe, repsMax } = input;
  if (lastLoadKg == null || lastReps == null) return null;
  const tRpe = targetRpe ?? 8;

  if (lastRpe != null) {
    if (lastRpe <= tRpe - 1.5) {
      return `Andata facile (RPE ${lastRpe}): prova ${round2(lastLoadKg + loadStep(lastLoadKg))} kg.`;
    }
    if (lastRpe >= tRpe + 1) {
      return `È stata dura (RPE ${lastRpe}): resta su ${round2(lastLoadKg)} kg e completa le ripetizioni pulite.`;
    }
  }
  if (repsMax != null && lastReps >= repsMax) {
    return `Hai chiuso il tetto di ripetizioni: sali a ${round2(lastLoadKg + loadStep(lastLoadKg))} kg.`;
  }
  return `Ripeti ${round2(lastLoadKg)} kg puntando a una ripetizione in più rispetto alle ${lastReps} di prima.`;
}
