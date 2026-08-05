'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, inputClass } from '@/components/ui';
import { cn } from '@/lib/utils';
import { AlertCircle, Check, NotebookPen } from 'lucide-react';

/** Il "post-it" del coach: FERRO opaco, si salva da solo quando smetti di scrivere. */
export function QuickNotes({ initialBody }: { initialBody: string }) {
  const [body, setBody] = useState(initialBody);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function save() {
    setState('saving');
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('quick_notes')
      .upsert(
        { coach_id: user!.id, body, updated_at: new Date().toISOString() },
        { onConflict: 'coach_id' }
      );
    // Conferma solo se l'upsert è andato a buon fine
    setState(error ? 'error' : 'saved');
  }

  return (
    <Card className="rise rise-4 flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xs bg-raised text-text-secondary">
            <NotebookPen size={18} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold text-white">Blocco note</h2>
            <p className="mt-0.5 text-[13px] text-text-secondary">
              Quello che ti ricordi tra una call e l&apos;altra.
            </p>
          </div>
        </div>

        {/* Salvataggio discreto: parla solo quando ha qualcosa da dire */}
        <span aria-live="polite" className="shrink-0 pt-1.5">
          {state === 'saving' && (
            <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-text-tertiary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden />
              Salvo…
            </span>
          )}
          {state === 'saved' && (
            <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-mint">
              <Check size={14} aria-hidden />
              Salvato
            </span>
          )}
          {state === 'error' && (
            <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-rose">
              <AlertCircle size={14} aria-hidden />
              Non salvato
            </span>
          )}
        </span>
      </div>

      <label htmlFor="quick-notes" className="sr-only">
        Note rapide del coach
      </label>
      <textarea
        id="quick-notes"
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setState('idle');
        }}
        onBlur={save}
        rows={5}
        placeholder="Andrea: chiamare per il carico sullo squat. Giulia: rivedere le calorie del weekend…"
        className={cn(inputClass, 'mt-4 min-h-[148px] flex-1 resize-none leading-relaxed')}
      />

      <p className="mt-2.5 text-[12px] text-text-tertiary">
        {state === 'error'
          ? 'Il salvataggio non è andato a buon fine: tocca fuori dal campo per riprovare.'
          : 'Si salva da solo quando esci dal campo.'}
      </p>
    </Card>
  );
}
