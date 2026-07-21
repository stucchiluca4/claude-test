/**
 * Aggregazioni per la dashboard analytics dell'atleta.
 * Funzioni pure: `now` va passato dall'esterno (niente stato nascosto).
 */

export interface WorkoutLogPoint {
  started_at: string;
  total_volume_kg: number | null;
}

export interface WeekBucket {
  weekStart: string; // YYYY-MM-DD (lunedì)
  label: string; // es. "12/5"
  count: number; // allenamenti nella settimana
  volumeKg: number; // volume totale della settimana
}

function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Attività settimanale (allenamenti e volume) delle ultime `weeksBack` settimane. */
export function weeklyActivity(logs: WorkoutLogPoint[], weeksBack: number, now: Date): WeekBucket[] {
  const thisMonday = mondayOf(now);
  const buckets: WeekBucket[] = [];
  const index = new Map<string, WeekBucket>();
  for (let i = weeksBack - 1; i >= 0; i--) {
    const ws = new Date(thisMonday);
    ws.setDate(ws.getDate() - i * 7);
    const bucket: WeekBucket = {
      weekStart: ymd(ws),
      label: `${ws.getDate()}/${ws.getMonth() + 1}`,
      count: 0,
      volumeKg: 0,
    };
    buckets.push(bucket);
    index.set(bucket.weekStart, bucket);
  }
  for (const log of logs) {
    const d = new Date(log.started_at);
    if (Number.isNaN(d.getTime())) continue;
    const bucket = index.get(ymd(mondayOf(d)));
    if (bucket) {
      bucket.count += 1;
      bucket.volumeKg += Number(log.total_volume_kg ?? 0);
    }
  }
  return buckets;
}

/**
 * Settimane consecutive con almeno un allenamento, contando dalla più recente.
 * La settimana corrente ancora vuota non spezza la serie (periodo di grazia).
 */
export function currentStreak(buckets: WeekBucket[]): number {
  let streak = 0;
  let started = false;
  for (let i = buckets.length - 1; i >= 0; i--) {
    const active = buckets[i].count > 0;
    if (!started) {
      if (active) {
        started = true;
        streak = 1;
      } else if (i === buckets.length - 1) {
        continue; // settimana corrente vuota: grazia
      } else {
        break;
      }
    } else if (active) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

/** Frequenza media di allenamenti a settimana, dalla prima settimana attiva. */
export function avgFrequencyPerWeek(buckets: WeekBucket[]): number {
  const firstActive = buckets.findIndex((b) => b.count > 0);
  if (firstActive === -1) return 0;
  const active = buckets.slice(firstActive);
  const total = active.reduce((acc, b) => acc + b.count, 0);
  return Math.round((total / active.length) * 10) / 10;
}

/** Variazione percentuale del volume tra la media delle prime e ultime N settimane attive. */
export function volumeTrendPct(buckets: WeekBucket[]): number | null {
  const active = buckets.filter((b) => b.count > 0);
  if (active.length < 2) return null;
  const half = Math.max(1, Math.floor(active.length / 2));
  const early = active.slice(0, half);
  const late = active.slice(active.length - half);
  const avg = (arr: WeekBucket[]) => arr.reduce((a, b) => a + b.volumeKg, 0) / arr.length;
  const earlyAvg = avg(early);
  if (earlyAvg <= 0) return null;
  return Math.round(((avg(late) - earlyAvg) / earlyAvg) * 100);
}
