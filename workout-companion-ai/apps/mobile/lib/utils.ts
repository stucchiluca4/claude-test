import { Alert } from 'react-native';

/** Giorno della settimana in formato DB: 1 = lunedì ... 7 = domenica. */
export function todayDayOfWeek(): number {
  return ((new Date().getDay() + 6) % 7) + 1;
}

/** Data locale in formato `YYYY-MM-DD`. */
export function localDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Lunedì della settimana corrente (`YYYY-MM-DD`) — usato come chiave dei check-in. */
export function mondayOfCurrentWeek(): string {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return localDateString(d);
}

/** Inizio della giornata di oggi, per filtrare i log "di oggi". */
export function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Parsing tollerante dei numeri digitati (accetta la virgola italiana). */
export function parseNum(value: string): number | null {
  const n = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Secondi -> `mm:ss` per timer e cronometro. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(m)}:${pad(s % 60)}`;
}

/** Alert standard per gli errori delle chiamate Supabase. */
export function showError(e: unknown, title = 'Errore'): void {
  const message = e instanceof Error ? e.message : 'Si è verificato un errore imprevisto.';
  Alert.alert(title, message);
}
