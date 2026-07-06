'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, buttonPrimary, inputClass } from '@/components/ui';

interface ProfileData {
  first_name: string;
  last_name: string;
  sex: string;
  date_of_birth: string;
  height_cm: number | null;
}

export function ProfileForm({ initial, email }: { initial: ProfileData; email: string }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setForm({ ...form, [key]: value });
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: form.first_name,
        last_name: form.last_name,
        sex: form.sex || null,
        date_of_birth: form.date_of_birth || null,
        height_cm: form.height_cm,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user!.id);

    setSaving(false);
    if (error) setError(error.message);
    else setSaved(true);
  }

  return (
    <Card className="max-w-xl">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1.5 text-text-secondary">Nome</label>
            <input
              value={form.first_name}
              onChange={(e) => set('first_name', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5 text-text-secondary">Cognome</label>
            <input
              value={form.last_name}
              onChange={(e) => set('last_name', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1.5 text-text-secondary">Email</label>
          <input value={email} disabled className={inputClass + ' opacity-60'} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1.5 text-text-secondary">Sesso</label>
            <select
              value={form.sex}
              onChange={(e) => set('sex', e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="male">Uomo</option>
              <option value="female">Donna</option>
              <option value="other">Altro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1.5 text-text-secondary">Data di nascita</label>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => set('date_of_birth', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5 text-text-secondary">Altezza (cm)</label>
            <input
              type="number"
              value={form.height_cm ?? ''}
              onChange={(e) => set('height_cm', e.target.value ? Number(e.target.value) : null)}
              className={inputClass}
            />
          </div>
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <button type="submit" disabled={saving} className={buttonPrimary}>
          {saving ? 'Salvataggio…' : saved ? '✓ Salvato' : 'Salva modifiche'}
        </button>
      </form>
    </Card>
  );
}
