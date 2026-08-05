'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { buttonPrimary, inputClass } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * Barra d'azione del coach: vive sul livello VETRO, ancorata in basso.
 * Il campo di scrittura resta FERRO opaco, così il testo è sempre leggibile.
 */
export function CheckinReviewForm({
  checkinId,
  initialFeedback,
  reviewed = false,
}: {
  checkinId: string;
  initialFeedback: string | null;
  /** Il check-in è già stato valutato: il feedback è una revisione, non una prima risposta. */
  reviewed?: boolean;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState(initialFeedback ?? '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: saveError } = await supabase
      .from('checkins')
      .update({
        coach_feedback: feedback,
        status: 'reviewed',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', checkinId);

    setLoading(false);
    if (saveError) {
      setError('Salvataggio non riuscito. Riprova.');
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          htmlFor="coach-feedback"
          className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary"
        >
          Il tuo feedback al cliente
        </label>
        {(saved || reviewed) && (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-mint">
            <CheckCircle2 size={14} aria-hidden />
            {saved ? 'Feedback inviato' : 'Check-in già valutato'}
          </span>
        )}
      </div>

      <textarea
        id="coach-feedback"
        value={feedback}
        onChange={(e) => {
          setFeedback(e.target.value);
          setSaved(false);
        }}
        rows={3}
        className={cn(inputClass, 'min-h-[88px] resize-y leading-relaxed')}
        placeholder="Cosa ha funzionato, cosa aggiustiamo questa settimana, cosa deve tenere d'occhio…"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-text-secondary">
          Arriva nell&apos;app del cliente e chiude la settimana.
        </p>
        <button
          type="submit"
          disabled={loading || !feedback}
          className={cn(buttonPrimary, 'min-h-[44px]')}
        >
          <Send size={16} aria-hidden />
          {loading
            ? 'Invio…'
            : saved
              ? 'Feedback inviato'
              : reviewed
                ? 'Aggiorna il feedback'
                : 'Invia e segna come valutato'}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-rose"
        >
          <AlertCircle size={14} aria-hidden />
          {error}
        </p>
      )}
    </form>
  );
}
