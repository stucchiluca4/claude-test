'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, inputClass, buttonPrimary } from '@/components/ui';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';

/** Se è viola, l'ha prodotto il motore: il colore riservato all'intelligenza. */
const SUGGESTIONS = [
  'Analizza i progressi delle ultime 4 settimane',
  'Il cliente sta recuperando bene?',
  'Suggerisci aggiustamenti per la prossima settimana',
];

/**
 * Widget AI Coach: fa una domanda alla Edge Function `ai-coach`,
 * che risponde usando i dati reali del cliente (check-in, allenamenti).
 *
 * Sistema "Glass Over Iron": identità viola, ma la risposta poggia sempre su
 * FERRO opaco (bg-raised) perché è testo da leggere, non un comando.
 */
export function AiCoachWidget({ coachClientId }: { coachClientId: string }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer(null);

    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke('ai-coach', {
      body: { question, coachClientId },
    });

    setLoading(false);
    if (error) {
      setError(
        "L'AI Coach non è ancora attivo: la Edge Function va pubblicata su Supabase (vedi supabase/README.md)."
      );
      return;
    }
    setAnswer(data?.answer ?? 'Nessuna risposta.');
  }

  return (
    <Card>
      {/* ---------- Identità: il motore che legge i dati di questo cliente ---------- */}
      <div className="flex items-start gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-sm bg-violet/15 text-violet"
          aria-hidden
        >
          <Sparkles size={20} />
        </span>
        <div className="min-w-0">
          <h3 className="text-[17px] font-bold leading-tight text-white">Coach AI</h3>
          <p className="mt-1 text-[13px] leading-snug text-text-secondary">
            Legge check-in e allenamenti reali di questo atleta e risponde con i numeri alla mano.
          </p>
        </div>
      </div>

      {/* ---------- Le domande che un coach fa più spesso ---------- */}
      <div className="mt-5">
        <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
          Domande frequenti
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setQuestion(s);
                inputRef.current?.focus();
              }}
              disabled={loading}
              className="press inline-flex min-h-[44px] items-center rounded-full bg-raised px-4 text-left text-[13px] font-semibold text-text-secondary transition hover:bg-[#252E3E] hover:text-white disabled:pointer-events-none disabled:opacity-45"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- La domanda ---------- */}
      <form onSubmit={ask} className="mt-4 flex flex-col gap-2 sm:flex-row" aria-busy={loading}>
        <input
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className={`${inputClass} flex-1`}
          placeholder="Fai una domanda sull'andamento del cliente…"
          aria-label="Domanda per il Coach AI"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className={`${buttonPrimary} shrink-0`}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden />
              Analizzo…
            </>
          ) : (
            'Chiedi'
          )}
        </button>
      </form>

      {/* ---------- L'attesa: si vede che sta leggendo, non che è bloccato ---------- */}
      {loading && (
        <div role="status" className="mt-4 rounded-sm bg-raised p-5">
          <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.06em] text-violet">
            <Sparkles size={14} aria-hidden />
            Sto leggendo check-in e allenamenti…
          </div>
          <div className="mt-3.5 space-y-2.5" aria-hidden>
            <span className="block h-3 w-[92%] animate-pulse rounded-full bg-violet/20" />
            <span className="block h-3 w-[74%] animate-pulse rounded-full bg-violet/15 [animation-delay:160ms]" />
            <span className="block h-3 w-[52%] animate-pulse rounded-full bg-violet/10 [animation-delay:320ms]" />
          </div>
        </div>
      )}

      {/* ---------- Quando il motore non risponde: avviso, non allarme ---------- */}
      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-sm bg-amber/10 p-4 text-[13px] leading-relaxed text-amber"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {/* ---------- La risposta: ferro opaco, testo pieno, nessun velo ---------- */}
      {answer && !loading && (
        <div
          aria-live="polite"
          className="mt-4 rounded-sm border border-violet/20 bg-raised p-5"
        >
          <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.06em] text-violet">
            <Sparkles size={14} aria-hidden />
            Risposta del Coach AI
          </div>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-white">{answer}</p>
        </div>
      )}
    </Card>
  );
}
