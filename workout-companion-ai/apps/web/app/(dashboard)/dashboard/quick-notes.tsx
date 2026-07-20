'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui';

/** Il "post-it" del coach: si salva da solo quando smetti di scrivere. */
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
    <Card className="h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">📝 Note rapide</h3>
        <span className={state === 'error' ? 'text-xs text-danger' : 'text-xs text-text-secondary'}>
          {state === 'saving'
            ? 'salvataggio…'
            : state === 'saved'
              ? '✓ salvato'
              : state === 'error'
                ? 'errore nel salvataggio'
                : ''}
        </span>
      </div>
      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setState('idle');
        }}
        onBlur={save}
        rows={5}
        placeholder="Scrivi una nota veloce… (si salva da sola)"
        className="w-full bg-transparent text-sm resize-none focus:outline-none placeholder:text-text-secondary"
      />
    </Card>
  );
}
