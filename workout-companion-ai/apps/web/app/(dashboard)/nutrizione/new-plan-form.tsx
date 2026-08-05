'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Minus, Plus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { buttonPrimary, buttonGhost, inputClass } from '@/components/ui';
import { cn } from '@/lib/utils';

const labelClass = 'block text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary';
const stepperButton =
  'press grid h-10 w-10 shrink-0 place-items-center rounded-xs bg-card text-white transition hover:bg-[#252E3E] disabled:opacity-35 disabled:pointer-events-none';

/**
 * Creazione piano alimentare: il pannello vive sul livello VETRO (è un foglio
 * di controlli), mentre campi, anteprima ed errori poggiano su ferro opaco
 * così restano sempre leggibili. Alla conferma crea il piano + i 7 giorni
 * della Settimana 1 e apre subito l'editor macro.
 */
export function NewPlanForm({ clients }: { clients: { id: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [weeks, setWeeks] = useState(4);
  const [kcal, setKcal] = useState(2500);
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
    if (!clientId) return setError('Seleziona un cliente.');
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: plan, error: err1 } = await supabase
      .from('nutrition_plans')
      .insert({
        created_by: user!.id,
        coach_client_id: clientId,
        name,
        duration_weeks: weeks,
        status: 'draft',
      })
      .select('id')
      .single();

    if (err1 || !plan) {
      setError(err1?.message ?? 'Errore sconosciuto');
      setLoading(false);
      return;
    }

    // Crea i 7 giorni della settimana 1 con macro di partenza (40/30/30 circa)
    const proteinG = Math.round((kcal * 0.3) / 4);
    const carbsG = Math.round((kcal * 0.4) / 4);
    const fatG = Math.round((kcal * 0.3) / 9);
    const days = Array.from({ length: 7 }, (_, i) => ({
      nutrition_plan_id: plan.id,
      week_number: 1,
      day_of_week: i + 1,
      day_type: i < 5 ? 'training' : 'rest',
      kcal,
      protein_g: proteinG,
      carbs_g: carbsG,
      fat_g: fatG,
    }));
    const { error: err2 } = await supabase.from('nutrition_days').insert(days);
    if (err2) {
      setError(err2.message);
      setLoading(false);
      return;
    }

    router.push(`/nutrizione/${plan.id}`);
    router.refresh();
  }

  /* Anteprima dei macro di partenza: 30% proteine · 40% carboidrati · 30% grassi */
  const previewProtein = Math.round((kcal * 0.3) / 4);
  const previewCarbs = Math.round((kcal * 0.4) / 4);
  const previewFat = Math.round((kcal * 0.3) / 9);
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
        Nuovo piano
      </button>

      {open && (
        <form
          onSubmit={handleCreate}
          role="dialog"
          aria-label="Crea un nuovo piano alimentare"
          className="glass-chrome absolute right-0 z-30 mt-2 w-[24rem] max-w-[calc(100vw_-_2.5rem)] rounded-lg p-5 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <p className={labelClass}>Nuovo piano alimentare</p>
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

          <label htmlFor="plan-name" className={cn(labelClass, 'mt-4')}>
            Nome piano
          </label>
          <input
            id="plan-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cn(inputClass, 'mt-2', error && 'border-rose')}
            placeholder="Es. Piano massa — autunno"
            aria-invalid={error ? true : undefined}
            autoFocus
          />

          <label htmlFor="plan-client" className={cn(labelClass, 'mt-3.5')}>
            Cliente
          </label>
          <select
            id="plan-client"
            required
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={cn(inputClass, 'mt-2')}
          >
            <option value="">Seleziona…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Durata: stepper con bersagli da 40px, il numero resta editabile */}
          <div className="mt-3.5 flex items-center justify-between gap-3">
            <label htmlFor="plan-weeks" className={labelClass}>
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
                id="plan-weeks"
                type="number"
                min={1}
                max={24}
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
                className="tnum h-10 w-14 border-none bg-transparent text-center text-[17px] font-bold text-white focus:outline-none"
              />
              <button
                type="button"
                className={stepperButton}
                onClick={() => setWeeks(Math.min(24, weeks + 1))}
                disabled={weeks >= 24}
                aria-label="Una settimana in più"
              >
                <Plus size={16} aria-hidden />
              </button>
            </div>
          </div>

          {/* Kcal di partenza: si muove a passi di 50, come si ragiona in studio */}
          <div className="mt-3.5 flex items-center justify-between gap-3">
            <label htmlFor="plan-kcal" className={labelClass}>
              Kcal di partenza
            </label>
            <div className="flex shrink-0 items-center gap-1 rounded-sm bg-raised p-1">
              <button
                type="button"
                className={stepperButton}
                onClick={() => setKcal(Math.max(800, kcal - 50))}
                disabled={kcal <= 800}
                aria-label="Cinquanta kcal in meno"
              >
                <Minus size={16} aria-hidden />
              </button>
              <input
                id="plan-kcal"
                type="number"
                min={800}
                step={50}
                value={kcal}
                onChange={(e) => setKcal(Number(e.target.value))}
                className="tnum h-10 w-20 border-none bg-transparent text-center text-[17px] font-bold text-white focus:outline-none"
              />
              <button
                type="button"
                className={stepperButton}
                onClick={() => setKcal(kcal + 50)}
                aria-label="Cinquanta kcal in più"
              >
                <Plus size={16} aria-hidden />
              </button>
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-3.5 flex items-start gap-2 rounded-xs bg-raised px-3 py-2.5 text-[13px] leading-snug text-rose"
            >
              <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
              {error}
            </p>
          ) : (
            <div className="mt-3.5 rounded-xs bg-raised px-3 py-2.5">
              <p className="tnum text-[13px] leading-snug text-text-secondary">
                Partiamo da <strong className="font-bold text-white">{kcal.toLocaleString('it-IT')} kcal</strong>{' '}
                su <strong className="font-bold text-white">7 giorni</strong> (5 ON + 2 OFF)
                {selectedClient ? (
                  <>
                    {' '}
                    per <strong className="font-bold text-white">{selectedClient.label}</strong>.
                  </>
                ) : (
                  '.'
                )}
              </p>
              <ul className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] font-semibold">
                <li className="tnum text-accent">P {previewProtein} g</li>
                <li className="tnum text-amber">C {previewCarbs} g</li>
                <li className="tnum text-cyan">G {previewFat} g</li>
                <li className="text-text-tertiary">ritoccabili giorno per giorno</li>
              </ul>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button type="submit" disabled={loading} className={cn(buttonPrimary, 'min-h-[44px] flex-1')}>
              {loading ? 'Creazione…' : 'Crea e apri l’editor'}
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
