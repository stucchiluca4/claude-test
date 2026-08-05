'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Minus, Plus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { buttonPrimary, buttonGhost, inputClass } from '@/components/ui';
import { PROGRAM_GOALS } from '@wc/shared';
import { cn } from '@/lib/utils';

/**
 * Creazione scheda: il pannello vive sul livello VETRO (è un foglio di
 * controlli), mentre campi ed errori poggiano su ferro opaco così restano
 * sempre leggibili. Alla conferma crea il programma + le settimane vuote e
 * apre subito il builder.
 */
export function NewProgramForm({ clients }: { clients: { id: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('hypertrophy');
  const [weeks, setWeeks] = useState(4);
  const [clientId, setClientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Esc chiude il foglio e riporta il fuoco sul comando che l'ha aperto.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1. Crea il programma
    const { data: program, error: err1 } = await supabase
      .from('programs')
      .insert({
        created_by: user!.id,
        coach_client_id: clientId || null,
        is_template: !clientId,
        name,
        goal,
        duration_weeks: weeks,
        status: 'draft',
      })
      .select('id')
      .single();

    if (err1 || !program) {
      setError(err1?.message ?? 'Errore sconosciuto');
      setLoading(false);
      return;
    }

    // 2. Crea le settimane vuote
    const weekRows = Array.from({ length: weeks }, (_, i) => ({
      program_id: program.id,
      week_number: i + 1,
    }));
    const { error: err2 } = await supabase.from('program_weeks').insert(weekRows);
    if (err2) {
      setError(err2.message);
      setLoading(false);
      return;
    }

    router.push(`/allenamenti/${program.id}`);
    router.refresh();
  }

  const labelClass = 'block text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary';
  const stepperButton =
    'press grid h-10 w-10 shrink-0 place-items-center rounded-xs bg-card text-white transition hover:bg-[#252E3E] disabled:opacity-35 disabled:pointer-events-none';

  const selectedClient = clients.find((c) => c.id === clientId);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        className={cn(buttonPrimary, 'min-h-[44px]')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Plus size={17} aria-hidden />
        Nuovo programma
      </button>

      {open && (
        <form
          onSubmit={handleCreate}
          role="dialog"
          aria-label="Crea una nuova scheda"
          className="glass-chrome absolute right-0 z-30 mt-2 w-[24rem] max-w-[calc(100vw_-_2.5rem)] rounded-lg p-5 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <p className={labelClass}>Nuova scheda</p>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              aria-label="Chiudi il pannello di creazione"
              className="press -mr-1.5 -mt-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-secondary transition hover:text-white"
            >
              <X size={16} aria-hidden />
            </button>
          </div>

          <label htmlFor="program-name" className={cn(labelClass, 'mt-4')}>
            Nome scheda
          </label>
          <input
            id="program-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cn(inputClass, 'mt-2', error && 'border-rose')}
            placeholder="Es. Massa Q3 — Blocco 1"
            aria-invalid={error ? true : undefined}
            autoFocus
          />

          <label htmlFor="program-goal" className={cn(labelClass, 'mt-3.5')}>
            Obiettivo
          </label>
          <select
            id="program-goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className={cn(inputClass, 'mt-2')}
          >
            {Object.entries(PROGRAM_GOALS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          {/* Durata: stepper con bersagli da 40px, il numero resta editabile */}
          <div className="mt-3.5 flex items-center justify-between gap-3">
            <label htmlFor="program-weeks" className={labelClass}>
              Durata in settimane
            </label>
            <div className="flex shrink-0 items-center gap-1 rounded-sm bg-raised p-1">
              <button
                type="button"
                className={stepperButton}
                onClick={() => setWeeks(Math.max(1, weeks - 1))}
                disabled={weeks <= 1}
                aria-label="Una settimana in meno"
              >
                <Minus size={16} aria-hidden />
              </button>
              <input
                id="program-weeks"
                type="number"
                required
                min={1}
                max={16}
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
                className="tnum h-10 w-14 border-none bg-transparent text-center text-[17px] font-bold text-white focus:outline-none"
              />
              <button
                type="button"
                className={stepperButton}
                onClick={() => setWeeks(Math.min(16, weeks + 1))}
                disabled={weeks >= 16}
                aria-label="Una settimana in più"
              >
                <Plus size={16} aria-hidden />
              </button>
            </div>
          </div>

          <label htmlFor="program-client" className={cn(labelClass, 'mt-3.5')}>
            Cliente (opzionale)
          </label>
          <select
            id="program-client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={cn(inputClass, 'mt-2')}
          >
            <option value="">Nessuno — salva come template</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          {error ? (
            <p
              role="alert"
              className="mt-3.5 flex items-start gap-2 rounded-xs bg-raised px-3 py-2.5 text-[13px] leading-snug text-rose"
            >
              <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
              {error}
            </p>
          ) : (
            <p className="tnum mt-3.5 rounded-xs bg-raised px-3 py-2.5 text-[13px] leading-snug text-text-secondary">
              Creiamo subito <strong className="font-bold text-white">{weeks}</strong>{' '}
              {weeks === 1 ? 'settimana vuota' : 'settimane vuote'}
              {selectedClient ? (
                <>
                  {' '}
                  per <strong className="font-bold text-white">{selectedClient.label}</strong>.
                </>
              ) : (
                <> come template riutilizzabile.</>
              )}{' '}
              Le riempi nel builder, sessione per sessione.
            </p>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button type="submit" disabled={loading} className={cn(buttonPrimary, 'min-h-[44px] flex-1')}>
              {loading ? 'Creazione…' : 'Crea e apri il builder'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className={cn(buttonGhost, 'min-h-[44px]')}
            >
              Annulla
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
