'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, buttonPrimary, inputClass } from '@/components/ui';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, CircleDot, Lock } from 'lucide-react';

interface ProfileData {
  first_name: string;
  last_name: string;
  sex: string;
  date_of_birth: string;
  height_cm: number | null;
}

/** Intestazione di sezione del modulo: 12px, maiuscoletto, spaziata. */
function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line/70 pt-6 first:border-0 first:pt-0">
      <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
        {title}
      </h3>
      {hint && <p className="mt-1.5 text-[13px] text-text-secondary">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Campo con etichetta esplicita: l'etichetta avvolge il controllo. */
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-semibold text-text-secondary">{label}</span>
      {children}
      {hint && <span className="mt-2 block text-[13px] text-text-secondary">{hint}</span>}
    </label>
  );
}

export function ProfileForm({ initial, email }: { initial: ProfileData; email: string }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setForm({ ...form, [key]: value });
    setSaved(false);
    setDirty(true);
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
    else {
      setSaved(true);
      setDirty(false);
    }
  }

  const displayName = [form.first_name, form.last_name].filter(Boolean).join(' ');
  const initials =
    ((form.first_name[0] ?? '') + (form.last_name[0] ?? '')).toUpperCase() ||
    (email[0] ?? '?').toUpperCase();

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
      {/* ---------- Come ti vedono i clienti ---------- */}
      <Card className="rise">
        <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
          Il tuo profilo
        </p>
        <div className="mt-4 flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-md bg-raised text-[22px] font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[17px] font-bold text-white">
              {displayName || 'Completa il tuo nome'}
            </p>
            <p className="truncate text-[13px] text-text-secondary">{email}</p>
          </div>
        </div>
        <p className="mt-5 text-[15px] leading-relaxed text-text-secondary">
          Nome e cognome compaiono nei messaggi, nei report e negli inviti che mandi ai tuoi
          clienti: tienili aggiornati.
        </p>
      </Card>

      {/* ---------- Il modulo: l'unico elemento a fuoco della pagina ---------- */}
      <Card beacon className="rise rise-1 lg:col-span-2">
        <form onSubmit={handleSave} className="grid gap-6">
          <Section title="Anagrafica" hint="Come ti presenti ai clienti.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nome">
                <input
                  value={form.first_name}
                  onChange={(e) => set('first_name', e.target.value)}
                  className={inputClass}
                  placeholder="Luca"
                />
              </Field>
              <Field label="Cognome">
                <input
                  value={form.last_name}
                  onChange={(e) => set('last_name', e.target.value)}
                  className={inputClass}
                  placeholder="Rossi"
                />
              </Field>
            </div>
          </Section>

          <Section title="Account">
            <Field label="Email" hint="L'indirizzo dell'account non si modifica da qui.">
              <div className="relative">
                <input value={email} disabled className={cn(inputClass, 'pr-11 opacity-60')} />
                <Lock
                  size={16}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary"
                  aria-hidden
                />
              </div>
            </Field>
          </Section>

          <Section title="Dati fisici" hint="Servono ai calcoli su misure e progressi.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Sesso">
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
              </Field>
              <Field label="Data di nascita">
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => set('date_of_birth', e.target.value)}
                  className={cn(inputClass, 'tnum')}
                />
              </Field>
              <Field label="Altezza (cm)">
                <input
                  type="number"
                  value={form.height_cm ?? ''}
                  onChange={(e) => set('height_cm', e.target.value ? Number(e.target.value) : null)}
                  className={cn(inputClass, 'tnum')}
                  placeholder="180"
                />
              </Field>
            </div>
          </Section>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2.5 rounded-sm bg-rose/10 px-4 py-3 text-[14px] font-semibold text-rose"
            >
              <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 border-t border-line/70 pt-6">
            <button type="submit" disabled={saving} className={buttonPrimary}>
              {saving ? 'Salvataggio…' : 'Salva modifiche'}
            </button>

            {/* Stato del salvataggio: colore + icona + parola, mai il solo colore. */}
            <p aria-live="polite" className="text-[14px] font-semibold">
              {saved ? (
                <span className="inline-flex items-center gap-2 text-mint">
                  <CheckCircle2 size={17} aria-hidden />
                  Profilo salvato
                </span>
              ) : dirty ? (
                <span className="inline-flex items-center gap-2 text-amber">
                  <CircleDot size={17} aria-hidden />
                  Modifiche non salvate
                </span>
              ) : (
                <span className="text-text-secondary">Tutto aggiornato</span>
              )}
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}
