'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { buttonPrimary, inputClass } from '@/components/ui';

export function NewPlanForm({ clients }: { clients: { id: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [weeks, setWeeks] = useState(4);
  const [kcal, setKcal] = useState(2500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="relative">
      <button className={buttonPrimary} onClick={() => setOpen(!open)}>
        + Nuovo piano
      </button>

      {open && (
        <form
          onSubmit={handleCreate}
          className="absolute right-0 mt-2 w-96 bg-card border border-border rounded-xl p-4 shadow-xl z-10 space-y-3"
        >
          <div>
            <label className="block text-sm mb-1.5 text-text-secondary">Nome piano</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Es. Piano massa — autunno"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5 text-text-secondary">Cliente</label>
            <select
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={inputClass}
            >
              <option value="">Seleziona…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1.5 text-text-secondary">Settimane</label>
              <input
                type="number"
                min={1}
                max={24}
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5 text-text-secondary">Kcal di partenza</label>
              <input
                type="number"
                min={800}
                step={50}
                value={kcal}
                onChange={(e) => setKcal(Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>
          {error && <p className="text-danger text-xs">{error}</p>}
          <button type="submit" disabled={loading} className={buttonPrimary + ' w-full'}>
            {loading ? 'Creazione…' : 'Crea piano'}
          </button>
        </form>
      )}
    </div>
  );
}
