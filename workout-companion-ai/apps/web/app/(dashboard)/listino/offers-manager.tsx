'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  Badge,
  EmptyState,
  GlassBar,
  KpiCard,
  inputClass,
  buttonPrimary,
  buttonSecondary,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Repeat,
  Sparkles,
  Trash2,
} from 'lucide-react';

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

/** Ritardi scalati per l'ingresso a cascata delle card. */
const RISE_DELAY = ['rise-1', 'rise-2', 'rise-3', 'rise-4', 'rise-5'];

/** Etichetta 12px maiuscoletta: intestazioni di sezione e di campo. */
const labelClass = 'block text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary';

/** Comando icona: bersaglio 44px, sempre con aria-label. */
const iconButton =
  'press grid h-11 w-11 shrink-0 place-items-center rounded-full bg-raised text-text-secondary transition hover:bg-[#252E3E] hover:text-white disabled:opacity-45 disabled:pointer-events-none';

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

  // Anteprima della rata mensile: stessa matematica mostrata poi sulla card.
  const months = parseInt(values.duration_months, 10);
  const cents = euroToCents(values.price_euro);
  const monthly =
    Number.isFinite(cents) && cents > 0 && Number.isFinite(months) && months > 1
      ? formatEuro(Math.round(cents / months))
      : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="grid gap-6"
    >
      <section>
        <h4 className={labelClass}>Identità del piano</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold text-text-secondary">
              Nome del piano
            </span>
            <input
              required
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
              className={inputClass}
              placeholder="Es. 3 Mesi"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold text-text-secondary">
              Prezzo totale (€)
            </span>
            <input
              required
              inputMode="decimal"
              pattern="[0-9]+([.,][0-9]{1,2})?"
              value={values.price_euro}
              onChange={(e) => setValues({ ...values, price_euro: e.target.value })}
              className={cn(inputClass, 'tnum')}
              placeholder="199,00"
            />
            <span className="mt-2 block text-[13px] text-text-secondary tnum">
              {monthly ? `Equivale a ${monthly} al mese.` : 'Importo complessivo del pacchetto.'}
            </span>
          </label>
        </div>
      </section>

      <section>
        <h4 className={labelClass}>Ritmo del percorso</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold text-text-secondary">
              Durata (mesi)
            </span>
            <input
              required
              type="number"
              min={1}
              max={36}
              value={values.duration_months}
              onChange={(e) => setValues({ ...values, duration_months: e.target.value })}
              className={cn(inputClass, 'tnum')}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold text-text-secondary">
              Frequenza check
            </span>
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
          </label>
        </div>
      </section>

      <section>
        <h4 className={labelClass}>Cosa include</h4>
        <label className="mt-3 block">
          <span className="mb-2 block text-[13px] font-semibold text-text-secondary">
            Descrizione mostrata al cliente
          </span>
          <textarea
            rows={3}
            value={values.description}
            onChange={(e) => setValues({ ...values, description: e.target.value })}
            className={inputClass}
            placeholder="Programma, check, chat, revisione video…"
          />
        </label>
      </section>

      <div className="flex flex-wrap gap-2 border-t border-line/70 pt-5">
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

  const published = offers.filter((o) => o.is_published);
  const drafts = offers.length - published.length;
  // Prezzo medio riportato al mese: l'unico modo per confrontare pacchetti di durata diversa.
  const avgMonthly =
    offers.length > 0
      ? formatEuro(
          Math.round(
            offers.reduce((sum, o) => sum + o.price_cents / Math.max(1, o.duration_months), 0) /
              offers.length
          )
        )
      : '—';

  return (
    <div>
      {/* ---------- Il polso del listino: tre numeri, in ferro ---------- */}
      {offers.length > 0 && (
        <section aria-label="Sintesi del listino" className="mb-5 grid gap-4 sm:grid-cols-3">
          <KpiCard
            label="Piani pubblicati"
            value={String(published.length)}
            delta={published.length === 0 ? 'Nessuno visibile ai clienti' : 'Visibili ai clienti'}
            deltaGood={published.length > 0}
            tone="mint"
          />
          <KpiCard
            label="Bozze da rifinire"
            value={String(drafts)}
            delta={drafts === 0 ? 'Listino completo' : 'Non ancora in vendita'}
            deltaGood={drafts === 0}
            tone="amber"
          />
          <KpiCard label="Prezzo medio / mese" value={avgMonthly} tone="neutral" />
        </section>
      )}

      {/* ---------- Livello VETRO: la barra dei comandi resta ancorata ---------- */}
      <GlassBar className="sticky top-4 z-20 mb-5 px-3 py-3">
        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <button className={buttonPrimary} onClick={() => setCreating(!creating)}>
            <Plus size={17} aria-hidden />
            {creating ? 'Chiudi nuovo piano' : 'Aggiungi nuovo piano'}
          </button>
          <button className={buttonSecondary} onClick={seedDefaults} disabled={loading}>
            <Sparkles size={17} aria-hidden />
            Crea piani predefiniti
          </button>
        </div>
      </GlassBar>

      {error && (
        <p
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-sm bg-rose/10 px-4 py-3 text-[14px] font-semibold text-rose"
        >
          <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {creating && (
        <Card beacon className="mb-5 rise">
          <h3 className="text-[22px] font-bold leading-tight tracking-[-0.01em] text-white">
            Nuovo piano
          </h3>
          <p className="mt-1.5 mb-5 text-[15px] text-text-secondary">
            Nasce come bozza: lo pubblichi tu quando è pronto.
          </p>
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
          title="Il listino è ancora vuoto"
          description='Aggiungi il tuo primo pacchetto di coaching, oppure parti da "Crea piani predefiniti": genera 4 piani standard (1, 3, 6 e 12 mesi) da personalizzare in un minuto.'
          action={
            <button className={buttonPrimary} onClick={seedDefaults} disabled={loading}>
              <Sparkles size={17} aria-hidden />
              Crea piani predefiniti
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {offers.map((offer, i) =>
            editingId === offer.id ? (
              <Card
                key={offer.id}
                beacon={!creating}
                className="rise md:col-span-2 xl:col-span-3"
              >
                <h3 className="text-[22px] font-bold leading-tight tracking-[-0.01em] text-white">
                  Modifica «{offer.name}»
                </h3>
                <p className="mt-1.5 mb-5 text-[15px] text-text-secondary">
                  Le modifiche valgono per i nuovi contratti.
                </p>
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
              <Card key={offer.id} className={cn('flex flex-col rise', RISE_DELAY[i % 5])}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 text-[22px] font-bold leading-tight tracking-[-0.01em] text-white">
                    {offer.name}
                  </h3>
                  <Badge color={offer.is_published ? 'success' : 'default'}>
                    {offer.is_published ? 'Pubblicato' : 'Bozza'}
                  </Badge>
                </div>

                {/* Il prezzo è il numero che domina la card */}
                <div className="mt-4">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-metric tnum text-[34px] font-extrabold leading-none text-white">
                      {formatEuro(offer.price_cents)}
                    </span>
                    <span className="text-[13px] font-semibold text-text-secondary">
                      {offer.duration_months === 1 ? '/ mese' : 'in totale'}
                    </span>
                  </div>
                  {offer.duration_months > 1 && (
                    <p className="mt-2 text-[13px] text-text-secondary tnum">
                      {formatEuro(Math.round(offer.price_cents / offer.duration_months))} al mese
                    </p>
                  )}
                </div>

                {offer.description && (
                  <p className="mt-4 line-clamp-3 text-[15px] leading-relaxed text-text-secondary">
                    {offer.description}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-11 items-center gap-2 rounded-sm bg-raised px-3.5 text-[14px] font-semibold text-white">
                    <CalendarDays size={16} className="text-text-secondary" aria-hidden />
                    <span className="tnum">{formatDuration(offer.duration_months)}</span>
                  </span>
                  <label className="relative inline-flex h-11 items-center gap-2 rounded-sm bg-raised pl-3.5 pr-9 text-[14px] font-semibold text-white">
                    <Repeat size={16} className="text-text-secondary" aria-hidden />
                    <span className="sr-only">Frequenza dei check di «{offer.name}»</span>
                    <select
                      value={offer.check_frequency}
                      onChange={(e) =>
                        updateOffer(offer.id, {
                          check_frequency: e.target.value as Offer['check_frequency'],
                        })
                      }
                      className="h-11 cursor-pointer appearance-none bg-transparent text-[14px] font-semibold text-white outline-none disabled:opacity-45"
                      disabled={loading}
                    >
                      {FREQUENCIES.map((f) => (
                        <option key={f.value} value={f.value} className="bg-raised">
                          {f.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={15}
                      className="pointer-events-none absolute right-3 text-text-secondary"
                      aria-hidden
                    />
                  </label>
                </div>

                <div className="mt-auto flex items-center gap-2 border-t border-line/70 pt-5">
                  <button
                    onClick={() => updateOffer(offer.id, { is_published: !offer.is_published })}
                    disabled={loading}
                    className={cn(
                      buttonSecondary,
                      'h-11 flex-1 py-0 text-[14px]',
                      offer.is_published && 'bg-mint/15 text-mint hover:bg-mint/25'
                    )}
                  >
                    {offer.is_published ? (
                      <>
                        <EyeOff size={16} aria-hidden />
                        Riporta in bozza
                      </>
                    ) : (
                      <>
                        <Eye size={16} aria-hidden />
                        Pubblica
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setEditingId(offer.id)}
                    disabled={loading}
                    className={iconButton}
                    aria-label={`Modifica il piano ${offer.name}`}
                    title="Modifica"
                  >
                    <Pencil size={17} aria-hidden />
                  </button>
                  <button
                    onClick={() => deleteOffer(offer)}
                    disabled={loading}
                    className={cn(iconButton, 'text-rose hover:bg-rose/15 hover:text-rose')}
                    aria-label={`Elimina il piano ${offer.name}`}
                    title="Elimina"
                  >
                    <Trash2 size={17} aria-hidden />
                  </button>
                </div>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  );
}
