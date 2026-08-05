import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, ChevronRight, Clock3, Hourglass } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState, KpiCard, buttonSecondary } from '@/components/ui';
import { cn, fullName, formatDate, formatKg } from '@/lib/utils';

/** Ogni stato porta colore + icona + parola: il colore non è mai l'unica informazione. */
type StatusKey = 'submitted' | 'reviewed' | 'pending';

const STATUS_META: Record<
  StatusKey,
  { label: string; color: 'warning' | 'success' | 'default'; icon: typeof Clock3 }
> = {
  submitted: { label: 'Da valutare', color: 'warning', icon: Clock3 },
  reviewed: { label: 'Valutato', color: 'success', icon: CheckCircle2 },
  pending: { label: 'In attesa', color: 'default', icon: Hourglass },
};

/** Ritardi scalati per l'ingresso della fascia KPI (il ritardo va sulla Card interna). */
const KPI_DELAY = [
  '[&>div]:[animation-delay:0ms]',
  '[&>div]:[animation-delay:50ms]',
  '[&>div]:[animation-delay:100ms]',
];

const DEMO_CHECKINS = [
  { id: 'demo-check-1', week_start: '2026-07-20', status: 'submitted', weight_kg: 82.4, submitted_at: '2026-07-27T08:12:00Z', coach_client: { client: { first_name: 'Andrea', last_name: 'Costa' } } },
  { id: 'demo-check-2', week_start: '2026-07-20', status: 'reviewed', weight_kg: 76.1, submitted_at: '2026-07-26T21:40:00Z', coach_client: { client: { first_name: 'Marco', last_name: 'Bellini' } } },
  { id: 'demo-check-3', week_start: '2026-07-20', status: 'submitted', weight_kg: 61.8, submitted_at: '2026-07-26T18:05:00Z', coach_client: { client: { first_name: 'Giulia', last_name: 'Rinaldi' } } },
];

export default async function CheckinsPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  if (demo === '1') {
    return <CheckinsBoard checkins={DEMO_CHECKINS} demo />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: checkins } = await supabase
    .from('checkins')
    .select(
      `id, week_start, status, weight_kg, submitted_at,
       coach_client:coach_clients!inner(coach_id, client:profiles!coach_clients_client_id_fkey(first_name, last_name))`
    )
    .eq('coach_client.coach_id', user!.id)
    .order('week_start', { ascending: false })
    .limit(50);

  return <CheckinsBoard checkins={checkins ?? []} />;
}

/** Iniziali dell'atleta, per riconoscere la riga prima ancora di leggerla. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type CheckinRow = {
  id: string;
  name: string;
  initials: string;
  status: StatusKey;
  week: string;
  weight: string;
  detail: string;
  href: string;
};

/** Tabella densa da 768px in su, lista di card sotto: stessi dati, stessa gerarchia. */
function CheckinRows({ rows }: { rows: CheckinRow[] }) {
  return (
    <>
      <table className="hidden w-full border-t border-line/60 text-left md:table">
        <thead>
          <tr className="border-b border-line/60">
            <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
              Cliente
            </th>
            <th className="px-4 py-3.5 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
              Settimana
            </th>
            <th className="px-4 py-3.5 text-right text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
              Peso
            </th>
            <th className="px-4 py-3.5 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
              Stato
            </th>
            <th className="px-6 py-3.5 text-right text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
              Check-in
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const meta = STATUS_META[row.status];
            const Icon = meta.icon;
            return (
              <tr
                key={row.id}
                className="border-b border-line/40 transition last:border-b-0 hover:bg-raised"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3.5">
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-raised text-[15px] font-bold text-white"
                      aria-hidden
                    >
                      {row.initials}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={row.href}
                        className="block truncate text-[17px] font-bold text-white transition hover:text-accent"
                      >
                        {row.name}
                      </Link>
                      <p className="mt-0.5 truncate text-[13px] text-text-secondary">{row.detail}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-[15px] tnum text-text-secondary">{row.week}</td>
                <td className="px-4 py-4 text-right text-[17px] font-bold tnum text-white">
                  {row.weight}
                </td>
                <td className="px-4 py-4">
                  <Badge color={meta.color}>
                    <Icon size={12} className="mr-1.5" aria-hidden />
                    {meta.label}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={row.href}
                    aria-label={`Apri il check-in di ${row.name} della settimana del ${row.week}`}
                    className="press inline-flex min-h-[44px] items-center gap-1 rounded-full px-3 text-[15px] font-semibold text-accent transition hover:text-accent-hover"
                  >
                    Apri
                    <ChevronRight size={16} aria-hidden />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul className="border-t border-line/60 md:hidden">
        {rows.map((row) => {
          const meta = STATUS_META[row.status];
          const Icon = meta.icon;
          return (
            <li key={row.id} className="border-b border-line/40 last:border-b-0">
              <Link
                href={row.href}
                aria-label={`Apri il check-in di ${row.name} della settimana del ${row.week}`}
                className="press flex items-center gap-3.5 px-5 py-4 transition hover:bg-raised"
              >
                <span
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-raised text-[15px] font-bold text-white"
                  aria-hidden
                >
                  {row.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[17px] font-bold text-white">{row.name}</span>
                    <span className="shrink-0 text-[15px] font-bold tnum text-white">{row.weight}</span>
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge color={meta.color}>
                      <Icon size={12} className="mr-1.5" aria-hidden />
                      {meta.label}
                    </Badge>
                    <span className="truncate text-[13px] tnum text-text-secondary">
                      Settimana del {row.week}
                    </span>
                  </span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-text-tertiary" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function CheckinsBoard({ checkins, demo = false }: { checkins: any[]; demo?: boolean }) {
  const rows: CheckinRow[] = checkins.map((ci) => {
    const status: StatusKey = STATUS_META[ci.status as StatusKey]
      ? (ci.status as StatusKey)
      : 'pending';
    const name = fullName((ci.coach_client as any)?.client ?? null);
    return {
      id: ci.id,
      name,
      initials: initialsOf(name),
      status,
      week: formatDate(ci.week_start),
      weight: formatKg(ci.weight_kg),
      detail: ci.submitted_at
        ? `Inviato il ${formatDate(ci.submitted_at)}`
        : 'Il cliente non ha ancora inviato',
      href: demo ? `/checkin/${ci.id}?demo=1` : `/checkin/${ci.id}`,
    };
  });

  const toReview = rows.filter((r) => r.status === 'submitted');
  const archive = rows.filter((r) => r.status !== 'submitted');
  const reviewed = rows.filter((r) => r.status === 'reviewed').length;
  const athletes = new Set(rows.map((r) => r.name)).size;

  const kpis: {
    label: string;
    value: string;
    delta?: string;
    deltaGood?: boolean;
    tone: 'neutral' | 'mint' | 'amber';
  }[] = [
    {
      label: 'Da valutare',
      value: String(toReview.length),
      delta: toReview.length === 0 ? 'Sei in pari' : 'Il cliente aspetta la tua risposta',
      deltaGood: toReview.length === 0,
      tone: 'amber',
    },
    {
      label: 'Valutati',
      value: String(reviewed),
      delta: `su ${rows.length} check-in ricevuti`,
      deltaGood: true,
      tone: 'mint',
    },
    {
      label: 'Atleti che inviano',
      value: String(athletes),
      tone: 'neutral',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Check & Progressi"
        subtitle={
          demo
            ? 'Stessa sezione check-in, compilata con progressi demo: perfetta da mostrare in call.'
            : 'I check-in settimanali dei tuoi clienti: peso, foto, benessere. Qui decidi la settimana che verrà.'
        }
        actions={
          demo ? (
            <>
              <Badge color="accent">Demo</Badge>
              <Link href="/checkin" className={cn(buttonSecondary, 'min-h-[44px]')}>
                Torna ai dati reali
              </Link>
            </>
          ) : (
            <Link href="/checkin?demo=1" className={cn(buttonSecondary, 'min-h-[44px]')}>
              Vedi con dati demo
              <ArrowUpRight size={16} aria-hidden />
            </Link>
          )
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          emoji="📸"
          title="Nessun check-in ricevuto"
          description="Quando i tuoi clienti invieranno il check-in settimanale dall'app — peso, foto, sonno, energia, aderenza — lo troverai qui, pronto da leggere e commentare."
          action={
            <Link href="/checkin?demo=1" className={cn(buttonSecondary, 'min-h-[44px]')}>
              Guarda com’è con dati demo
              <ArrowUpRight size={16} aria-hidden />
            </Link>
          }
        />
      ) : (
        <>
          {/* ---------- Il polso della settimana ---------- */}
          <section
            aria-label="Stato dei check-in"
            className="grid grid-cols-2 gap-4 md:grid-cols-3"
          >
            {kpis.map((kpi, i) => (
              <div key={kpi.label} className={KPI_DELAY[i]}>
                <KpiCard
                  label={kpi.label}
                  value={kpi.value}
                  delta={kpi.delta}
                  deltaGood={kpi.deltaGood}
                  tone={kpi.tone}
                />
              </div>
            ))}
          </section>

          {/* ---------- IL FARO: la coda di lavoro ---------- */}
          <Card beacon={toReview.length > 0} className="rise rise-3 overflow-hidden p-0">
            <div className="flex flex-wrap items-start justify-between gap-3 px-6 pb-4 pt-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <Clock3 size={19} className="shrink-0 text-amber" aria-hidden />
                  <h2 className="text-[17px] font-bold text-white">Da valutare</h2>
                </div>
                <p className="mt-1 text-[13px] text-text-secondary">
                  Check-in arrivati e ancora senza il tuo feedback. Apri, leggi, rispondi.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-raised px-3 py-1.5 text-[13px] font-bold tnum text-white">
                {toReview.length} in attesa
              </span>
            </div>

            {toReview.length === 0 ? (
              <div className="flex items-center gap-3 border-t border-line/60 px-6 py-6">
                <CheckCircle2 size={20} className="shrink-0 text-mint" aria-hidden />
                <p className="text-[15px] text-text-secondary">
                  Sei in pari: nessun check-in in attesa della tua valutazione.
                </p>
              </div>
            ) : (
              <CheckinRows rows={toReview} />
            )}
          </Card>

          {/* ---------- Lo storico ---------- */}
          {archive.length > 0 && (
            <Card className="rise rise-4 overflow-hidden p-0">
              <div className="flex flex-wrap items-start justify-between gap-3 px-6 pb-4 pt-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={19} className="shrink-0 text-text-secondary" aria-hidden />
                    <h2 className="text-[17px] font-bold text-white">Storico check-in</h2>
                  </div>
                  <p className="mt-1 text-[13px] text-text-secondary">
                    Settimane già chiuse: riaprile per rileggere foto, numeri e il feedback che hai dato.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-raised px-3 py-1.5 text-[13px] font-bold tnum text-white">
                  {archive.length} {archive.length === 1 ? 'settimana' : 'settimane'}
                </span>
              </div>
              <CheckinRows rows={archive} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
