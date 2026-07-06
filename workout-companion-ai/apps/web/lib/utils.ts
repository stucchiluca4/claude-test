import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Combina classi Tailwind in modo sicuro. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatKg(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${value.toLocaleString('it-IT')} kg`;
}

export function fullName(p: { first_name: string | null; last_name: string | null } | null): string {
  if (!p) return '—';
  return [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Senza nome';
}
