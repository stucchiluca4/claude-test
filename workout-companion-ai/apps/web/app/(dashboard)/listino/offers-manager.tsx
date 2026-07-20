'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Badge, EmptyState, inputClass, buttonPrimary, buttonSecondary } from '@/components/ui';

export type Offer = {
  id: string;
  coach_id: string;
  name: string;
  description: string | null;
  duration_months: number;
  check_frequency: 'settimanale' | 'bisettimanale' | 'mensile';
  price_cents: number;
  currency: string;
  is_published: boolean;
  sort_order: number;
  created_at: string;
};

const FREQUENCIES: { value: Offer['check_frequency']; label: string }[] = [
  { value: 'settimanale', label: 'Check settimanale' },
  { value: 'bisettimanale', label: 'Check bisettimanale' },
  { value: 'mensile', label: 'Check mensile' },
];

const DEFAULT_OFFERS = [
  { name: 'Mensile', duration_months: 1, price_cents: 7900, check_frequency: 'settimanale' },
  { name: '3 Mesi', duration_months: 3, price_cents: 19900, check_frequency: 'settimanale' },
  { name: '6 Mesi', duration_months: 6, price_cents: 35900, check_frequency: 'bisettimanale' },
  { name: 'Annuale', duration_months: 12, price_cents: 64900, check_frequency: 'settimanale' },
] as const;

function formatEuro(cents: number): string {
  return `€ ${(cents / 100).toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDuration(months: number): string {
  return months === 1 ? '1 mese' : `${months} mesi`;
}

/** Converte un prezzo in euro digitato dall'utente (es. "79,00") in centesimi. */
function euroToCents(value: string): number {
  return Math.round(parseFloat(value.replace(',', '.')) * 100);
}

type FormValues = {
  name: string;
  description: string;
  duration_months: string;
  price_euro: string;
  check_frequency: Offer['check_frequency'];
};

const EMPTY_FORM: FormValues = {
  name: '',
  description: '',
  duration_months: '1',
  price_euro: '',
  check_frequency: 'settimanale',
};

function OfferForm({
  initial,
  submitLabel,
  loading,
  onSubmit,
  onCancel,
}: {
  initial: FormValues;
  submitLabel: string;
  loading: boolean;
  onSubmit: (values: FormValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<FormValues>(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="grid gap-3"
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1.5 text-text-secondary">Nome del piano</label>
          <input
            required
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            className={inputClass}
            placeholder="Es. 3 Mesi"
          />
        </div>
        <div>
          <label className="block text-sm mb-1.5 text-text-secondary">Prezzo totale (€)</label>
          <input
            required
            inputMode="decimal"
            pattern="[0-9]+([.,][0-9]{1,2})?"
            value={values.price_euro}
            onChange={(e) => setValues({ ...values, price_euro: e.target.value })}
            className={inputClass}
            placeholder="199,00"
          />
        </div>
        <div>
          <label className="block text-sm mb-1.5 text-text-secondary">Durata (mesi)</label>
          <input
            required
            type="number"
            min={1}
            max={36}
            value={values.duration_months}
            onChange={(e) => setValues({ ...values, duration_months: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm mb-1.5 text-text-secondary">Frequenza check</label>
          <select
            value={values.check_frequency}
            onChange={(e) =>
              setValues({ ...values, check_frequency: e.target.value as Offer['check_frequency'] })
            }
            className={inputClass}
          >
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm mb-1.5 text-text-secondary">Descrizione</label>
        <textarea
          rows={2}
          value={values.description}
          onChange={(e) => setValues({ ...values, description: e.target.value })}
          className={inputClass}
          placeholder="Cosa include il piano…"
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className={buttonPrimary}>
          {loading ? 'Salvataggio…' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={buttonSecondary}>
          Annulla
        </button>
      </div>
    </form>
  );
}

export function OffersManager({ offers: initialOffers }: { offers: Offer[] }) {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>(initialOffers);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function fail(message: string) {
    setError('Errore: ' + message);
    setLoading(false);
  }

  async function seedDefaults() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const rows = DEFAULT_OFFERS.map((o, i) => ({
      coach_id: user!.id,
      name: o.name,
      description: `Programma di coaching online durata ${formatDuration(o.duration_months)}.`,
      duration_months: o.duration_months,
      check_frequency: o.check_frequency,
      price_cents: o.price_cents,
      is_published: false,
      sort_order: i,
    }));

    const { data, error } = await supabase.from('coach_offers').insert(rows).select();
    if (error) return fail(error.message);

    setOffers((prev) => [...prev, ...((data ?? []) as Offer[])]);
    setLoading(false);
    router.refresh();
  }

  async function createOffer(values: FormValues) {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('coach_offers')
      .insert({
        coach_id: user!.id,
        name: values.name.trim(),
        description: values.description.trim() || null,
        duration_months: parseInt(values.duration_months, 10),
        check_frequency: values.check_frequency,
        price_cents: euroToCents(values.price_euro),
        is_published: false,
        sort_order: offers.length > 0 ? Math.max(...offers.map((o) => o.sort_order)) + 1 : 0,
      })
      .select()
      .single();
    if (error) return fail(error.message);

    setOffers((prev) => [...prev, data as Offer]);
    setCreating(false);
    setLoading(false);
    router.refresh();
  }

  async function updateOffer(id: string, patch: Partial<Offer>) {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from('coach_offers').update(patch).eq('id', id);
    if (error) return fail(error.message);

    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    setEditingId(null);
    setLoading(false);
    router.refresh();
  }

  async function deleteOffer(offer: Offer) {
    if (!confirm(`Eliminare il piano "${offer.name}"? L'operazione non è reversibile.`)) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from('coach_offers').delete().eq('id', offer.id);
    if (error) return fail(error.message);

    setOffers((prev) => prev.filter((o) => o.id !== offer.id));
    setLoading(false);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <button className={buttonPrimary} onClick={() => setCreating(!creating)}>
          + Aggiungi nuovo piano
        </button>
        <button className={buttonSecondary} onClick={seedDefaults} disabled={loading}>
          Crea piani predefiniti
        </button>
      </div>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {creating && (
        <Card className="mb-4">
          <h3 className="font-semibold mb-3">Nuovo piano</h3>
          <OfferForm
            initial={EMPTY_FORM}
            submitLabel="Crea piano"
            loading={loading}
            onSubmit={createOffer}
            onCancel={() => setCreating(false)}
          />
        </Card>
      )}

      {offers.length === 0 && !creating ? (
        <EmptyState
          emoji="💼"
          title="Nessun piano nel listino"
          description='Aggiungi il tuo primo piano di coaching, oppure usa "Crea piani predefiniti" per generare 4 piani standard (1, 3, 6 e 12 mesi) da personalizzare.'
          action={
            <button className={buttonPrimary} onClick={seedDefaults} disabled={loading}>
              Crea piani predefiniti
            </button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {offers.map((offer) =>
            editingId === offer.id ? (
              <Card key={offer.id}>
                <h3 className="font-semibold mb-3">Modifica «{offer.name}»</h3>
                <OfferForm
                  initial={{
                    name: offer.name,
                    description: offer.description ?? '',
                    duration_months: String(offer.duration_months),
                    // Numero "puro" (punto decimale, senza separatore migliaia):
                    // deve rispettare il pattern del campo ed essere rileggibile da euroToCents.
                    price_euro: (offer.price_cents / 100).toFixed(2),
                    check_frequency: offer.check_frequency,
                  }}
                  submitLabel="Salva modifiche"
                  loading={loading}
                  onSubmit={(values) =>
                    updateOffer(offer.id, {
                      name: values.name.trim(),
                      description: values.description.trim() || null,
                      duration_months: parseInt(values.duration_months, 10),
                      price_cents: euroToCents(values.price_euro),
                      check_frequency: values.check_frequency,
                    })
                  }
                  onCancel={() => setEditingId(null)}
                />
              </Card>
            ) : (
              <Card key={offer.id}>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{offer.name}</h3>
                      <Badge color={offer.is_published ? 'success' : 'default'}>
                        {offer.is_published ? 'Attivo' : 'Bozza'}
                      </Badge>
                    </div>
                    {offer.description && (
                      <p className="text-sm text-text-secondary mt-1">{offer.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-sm text-text-secondary">
                      <span>{formatDuration(offer.duration_months)}</span>
                      <span aria-hidden>·</span>
                      <select
                        value={offer.check_frequency}
                        onChange={(e) =>
                          updateOffer(offer.id, {
                            check_frequency: e.target.value as Offer['check_frequency'],
                          })
                        }
                        className={inputClass + ' w-auto py-1'}
                        disabled={loading}
                      >
                        {FREQUENCIES.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="text-right">
                    {offer.duration_months === 1 ? (
                      <div className="text-lg font-bold">{formatEuro(offer.price_cents)} / mese</div>
                    ) : (
                      <>
                        <div className="text-lg font-bold">{formatEuro(offer.price_cents)}</div>
                        <div className="text-sm text-text-secondary">
                          {formatEuro(Math.round(offer.price_cents / offer.duration_months))} / mese
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateOffer(offer.id, { is_published: !offer.is_published })}
                      disabled={loading}
                      className={
                        buttonSecondary +
                        (offer.is_published ? ' text-success border-success/40' : ' text-text-secondary')
                      }
                    >
                      {offer.is_published ? 'Pubblicato' : 'Non pubblicato'}
                    </button>
                    <button
                      onClick={() => setEditingId(offer.id)}
                      disabled={loading}
                      className={buttonSecondary}
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => deleteOffer(offer)}
                      disabled={loading}
                      className={buttonSecondary + ' text-danger border-danger/40'}
                    >
                      Elimina
                    </button>
                  </div>
                </div>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  );
}
