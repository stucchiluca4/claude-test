'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, inputClass, buttonPrimary } from '@/components/ui';
import { Sparkles } from 'lucide-react';

/**
 * Widget AI Coach: fa una domanda alla Edge Function `ai-coach`,
 * che risponde usando i dati reali del cliente (check-in, allenamenti).
 */
export function AiCoachWidget({ coachClientId }: { coachClientId: string }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const SUGGESTIONS = [
    'Analizza i progressi delle ultime 4 settimane',
    'Il cliente sta recuperando bene?',
    "Suggerisci aggiustamenti per la prossima settimana",
  ];

  return (
    <Card>
      <h3 className="font-semibold mb-1 flex items-center gap-2">
        <Sparkles size={16} className="text-accent" /> AI Coach
      </h3>
      <p className="text-xs text-text-secondary mb-4">
        Risponde basandosi sui dati reali di questo cliente.
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setQuestion(s)}
            className="text-xs border border-border rounded-full px-3 py-1 text-text-secondary hover:bg-card-hover transition"
          >
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={ask} className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className={inputClass}
          placeholder="Fai una domanda sull'andamento del cliente…"
        />
        <button type="submit" disabled={loading || !question.trim()} className={buttonPrimary}>
          {loading ? '…' : 'Chiedi'}
        </button>
      </form>

      {error && <p className="text-warning text-sm mt-3">{error}</p>}
      {answer && (
        <div className="mt-4 bg-background border border-border rounded-lg p-4 text-sm whitespace-pre-wrap">
          {answer}
        </div>
      )}
    </Card>
  );
}
