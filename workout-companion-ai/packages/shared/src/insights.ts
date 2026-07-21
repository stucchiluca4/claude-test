/**
 * Motore di insight DETERMINISTICO (data-driven, senza LLM).
 * Prende dati già aggregati dell'atleta e produce suggerimenti tipizzati.
 * Ordinati per priorità: prima gli avvisi (azionabili), poi i positivi, poi info.
 */

export type InsightSeverity = 'positive' | 'info' | 'warning';

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  body: string;
}

export interface InsightInput {
  totalWorkouts: number;
  /** Variazione % del volume tra inizio e fine periodo. */
  trendPct: number | null;
  /** Media allenamenti/settimana nella prima e nella seconda metà del periodo. */
  countFirstHalfAvg: number;
  countLateHalfAvg: number;
  streak: number;
  /** Biofeedback recente (dal più recente), scale 1-10. */
  recovery: { recovery: number | null; muscle_soreness: number | null; sleep_quality: number | null }[];
  /** Variazione % dell'1RM stimato sull'esercizio più allenato. */
  strengthDeltaPct: number | null;
  strengthExerciseName: string | null;
  /** Volume per gruppo muscolare nel periodo. */
  muscleVolume: { group: string; volumeKg: number }[];
  /** Giorno della settimana col volume medio più alto (etichetta pronta). */
  bestDay: string | null;
}

const avg = (nums: number[]): number | null =>
  nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;

function nn(values: (number | null | undefined)[]): number[] {
  return values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
}

export function generateInsights(input: InsightInput): Insight[] {
  const insights: Insight[] = [];

  // Servono almeno un paio di sedute perché gli insight siano significativi.
  if (input.totalWorkouts < 2) return insights;

  // --- Recupero / sovrallenamento (priorità alta) ---
  const recent = input.recovery.slice(0, 3);
  const previous = input.recovery.slice(3, 6);
  const recentRecovery = avg(nn(recent.map((r) => r.recovery)));
  const prevRecovery = avg(nn(previous.map((r) => r.recovery)));
  const recentSoreness = avg(nn(recent.map((r) => r.muscle_soreness)));

  if ((recentRecovery != null && recentRecovery <= 4) || (recentSoreness != null && recentSoreness >= 7)) {
    insights.push({
      id: 'overreaching',
      severity: 'warning',
      title: 'Possibile sovraccarico',
      body: 'Recupero basso e/o dolori muscolari alti negli ultimi giorni. Valuta una settimana di scarico (deload) o un giorno di riposo in più, e parlane col coach.',
    });
  } else if (recentRecovery != null && prevRecovery != null && prevRecovery - recentRecovery >= 1.5) {
    insights.push({
      id: 'recovery-down',
      severity: 'warning',
      title: 'Recupero in calo',
      body: 'Il tuo recupero percepito sta scendendo rispetto ai giorni scorsi: cura sonno e alimentazione e non alzare troppo i carichi questa settimana.',
    });
  }

  // --- Volume ---
  if (input.trendPct != null && input.trendPct <= -15) {
    insights.push({
      id: 'volume-down',
      severity: 'warning',
      title: 'Volume in calo',
      body: `Il volume di allenamento è sceso del ${Math.abs(input.trendPct)}% nel periodo. Se non è una scelta (scarico), prova a recuperare qualche serie.`,
    });
  } else if (input.trendPct != null && input.trendPct >= 15) {
    insights.push({
      id: 'volume-up',
      severity: 'positive',
      title: 'Volume in crescita',
      body: `Ottimo: +${input.trendPct}% di volume nel periodo. La progressione è la chiave dei risultati — continua così.`,
    });
  }

  // --- Forza ---
  if (input.strengthDeltaPct != null && input.strengthExerciseName) {
    if (input.strengthDeltaPct >= 5) {
      insights.push({
        id: 'strength-up',
        severity: 'positive',
        title: 'Forza in miglioramento',
        body: `Il tuo 1RM stimato su ${input.strengthExerciseName} è salito del ${input.strengthDeltaPct}%. Stai diventando più forte!`,
      });
    } else if (input.strengthDeltaPct <= -5) {
      insights.push({
        id: 'strength-down',
        severity: 'warning',
        title: 'Forza in calo',
        body: `L'1RM stimato su ${input.strengthExerciseName} è sceso del ${Math.abs(input.strengthDeltaPct)}%. Può dipendere da stanchezza o recupero: valuta con il coach.`,
      });
    } else {
      insights.push({
        id: 'strength-plateau',
        severity: 'info',
        title: 'Forza stabile',
        body: `Su ${input.strengthExerciseName} sei su un plateau: prova ad aumentare leggermente carico o ripetizioni, o cambia schema.`,
      });
    }
  }

  // --- Costanza ---
  if (input.countLateHalfAvg > input.countFirstHalfAvg + 0.5) {
    insights.push({
      id: 'consistency-up',
      severity: 'positive',
      title: 'Costanza in aumento',
      body: `Ti stai allenando più spesso (${input.countLateHalfAvg}/sett. contro ${input.countFirstHalfAvg}). La costanza batte tutto.`,
    });
  } else if (input.countFirstHalfAvg > 0 && input.countLateHalfAvg < input.countFirstHalfAvg - 0.5) {
    insights.push({
      id: 'consistency-down',
      severity: 'warning',
      title: 'Costanza in calo',
      body: 'Hai ridotto la frequenza delle ultime settimane. Fissa giorni fissi di allenamento per ritrovare il ritmo.',
    });
  }

  // --- Giorno migliore ---
  if (input.bestDay && input.totalWorkouts >= 4) {
    insights.push({
      id: 'best-day',
      severity: 'info',
      title: 'Il tuo giorno migliore',
      body: `Rendi di più il ${input.bestDay}: se puoi, mettici gli allenamenti più impegnativi.`,
    });
  }

  // --- Gruppo muscolare poco allenato ---
  const groups = input.muscleVolume.filter((g) => g.group && g.volumeKg > 0);
  if (groups.length >= 3) {
    const totalVol = groups.reduce((a, g) => a + g.volumeKg, 0);
    const weakest = groups.reduce((min, g) => (g.volumeKg < min.volumeKg ? g : min), groups[0]);
    const share = weakest.volumeKg / totalVol;
    if (share < 0.5 / groups.length) {
      insights.push({
        id: 'weak-group',
        severity: 'info',
        title: 'Gruppo poco allenato',
        body: `Stai dando poco volume a "${weakest.group}" rispetto agli altri. Se è tra i tuoi obiettivi, aggiungi lavoro dedicato.`,
      });
    }
  }

  const rank: Record<InsightSeverity, number> = { warning: 0, positive: 1, info: 2 };
  return insights.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
