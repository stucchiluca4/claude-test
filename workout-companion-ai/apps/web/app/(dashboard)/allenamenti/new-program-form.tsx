'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { buttonPrimary, inputClass } from '@/components/ui';
import { PROGRAM_GOALS } from '@wc/shared';

export function NewProgramForm({ clients }: { clients: { id: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('hypertrophy');
  const [weeks, setWeeks] = useState(4);
  const [clientId, setClientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="relative">
      <button className={buttonPrimary} onClick={() => setOpen(!open)}>
        + Nuovo programma
      </button>

      {open && (
        <form
          onSubmit={handleCreate}
          className="absolute right-0 mt-2 w-96 glass rounded-xl p-4 shadow-xl z-10 space-y-3"
        >
          <div>
            <label className="block text-sm mb-1.5 text-text-secondary">Nome scheda</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Es. Massa Q3 — Blocco 1"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1.5 text-text-secondary">Obiettivo</label>
              <select value={goal} onChange={(e) => setGoal(e.target.value)} className={inputClass}>
                {Object.entries(PROGRAM_GOALS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1.5 text-text-secondary">Settimane</label>
              <input
                type="number"
                min={1}
                max={16}
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1.5 text-text-secondary">Cliente (opzionale)</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={inputClass}
            >
              <option value="">Nessuno — salva come template</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-danger text-xs">{error}</p>}
          <button type="submit" disabled={loading} className={buttonPrimary + ' w-full'}>
            {loading ? 'Creazione…' : 'Crea e apri il builder'}
          </button>
        </form>
      )}
    </div>
  );
}
