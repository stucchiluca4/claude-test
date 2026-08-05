import Link from 'next/link';
import {
  Archive,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  PauseCircle,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState, KpiCard, buttonSecondary } from '@/components/ui';
import { cn, fullName, formatDate } from '@/lib/utils';
import { InviteClientForm } from './invite-form';

type StatusKey = 'active' | 'invited' | 'paused' | 'ended';

/** Ogni stato porta colore + icona + parola: il colore non è mai l'unica informazione. */
const STATUS_META: Record<
  StatusKey,
  { label: string; color: 'success' | 'warning' | 'default' | 'danger'; icon: typeof CheckCircle2 }
> = {
  active: { label: 'Attivo', color: 'success', icon: CheckCircle2 },
  invited: { label: 'Invitato', color: 'warning', icon: Clock3 },
  paused: { label: 'In pausa', color: 'default', icon: PauseCircle },
  ended: { label: 'Concluso', color: 'danger', icon: Archive },
};

/** Ritardi scalati per l'ingresso della fascia KPI (il ritardo va sulla Card interna). */
const KPI_DELAY = [
  '[&>div]:[animation-delay:0ms]',
  '[&>div]:[animation-delay:50ms]',
  '[&>div]:[animation-delay:100ms]',
  '[&>div]:[animation-delay:150ms]',
];

const DEMO_CLIENTS = [
  { id: 'demo-marco', status: 'active', invite_email: null, started_at: '2026-05-04', client: { first_name: 'Marco', last_name: 'Bellini', avatar_url: null } },
  { id: 'demo-giulia', status: 'active', invite_email: null, started_at: '2026-04-15', client: { first_name: 'Giulia', last_name: 'Rinaldi', avatar_url: null } },
  { id: 'demo-andrea', status: 'paused', invite_email: null, started_at: '2026-03-20', client: { first_name: 'Andrea', last_name: 'Costa', avatar_url: null } },
  { id: 'demo-sofia', status: 'invited', invite_email: 'sofia.demo@example.com', started_at: null, client: null },
];

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  if (demo === '1') {
    return <ClientsRoster clients={DEMO_CLIENTS} demo />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: clients } = await supabase
    .from('coach_clients')
    .select(
      'id, status, invite_email, started_at, created_at, client:profiles!coach_clients_client_id_fkey(first_name, last_name, avatar_url)'
    )
    .eq('coach_id', user!.id)
    .order('created_at', { ascending: false });

  return <ClientsRoster clients={clients ?? []} />;
}

/** Iniziali dell'atleta: dal nome, o dalla parte locale dell'email se il profilo non esiste ancora. */
function initialsOf(name: string): string {
  const base = name.includes('@') ? name.split('@')[0].replace(/[._+-]+/g, ' ') : name;
  const parts = base.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Da quanto dura il percorso: la riga racconta il tempo, la colonna racconta la data. */
function tenureLabel(startedAt: string | null | undefined): string {
  if (!startedAt) return 'Data di inizio da impostare';
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(startedAt) ? `${startedAt}T12:00:00` : startedAt;
  const weeks = Math.floor((Date.now() - new Date(iso).getTime()) / (7 * 24 * 3600 * 1000));
  if (!isFinite(weeks) || weeks < 0) return 'Percorso in avvio';
  if (weeks === 0) return 'Prima settimana di percorso';
  if (weeks === 1) return '1 settimana di percorso';
  return `${weeks} settimane di percorso`;
}

type RosterRow = {
  id: string;
  name: string;
  initials: string;
  status: StatusKey;
  detail: string;
  startedAt: string | null;
  href: string;
};

function ClientsRoster({ clients, demo = false }: { clients: any[]; demo?: boolean }) {
  const rows: RosterRow[] = clients.map((c) => {
    const status: StatusKey = STATUS_META[c.status as StatusKey] ? (c.status as StatusKey) : 'ended';
    const name = c.client ? fullName(c.client as any) : (c.invite_email ?? 'Invito inviato');
    return {
      id: c.id,
      name,
      initials: initialsOf(name),
      status,
      detail:
        status === 'invited'
          ? "In attesa che accetti l'invito"
          : tenureLabel(c.started_at ?? c.created_at ?? null),
      startedAt: c.started_at ?? null,
      href: demo ? `/clienti/${c.id}?demo=1` : `/clienti/${c.id}`,
    };
  });

  const count = (status: StatusKey) => rows.filter((r) => r.status === status).length;

  const kpis: {
    label: string;
    value: string;
    delta?: string;
    deltaGood?: boolean;
    tone: 'neutral' | 'mint' | 'amber' | 'rose';
  }[] = [
    {
      label: 'Attivi',
      value: String(count('active')),
      delta: `su ${rows.length} in anagrafica`,
      deltaGood: true,
      tone: 'mint',
    },
    {
      label: 'In onboarding',
      value: String(count('invited')),
      delta: count('invited') === 0 ? 'Nessuno in attesa' : 'Devono accettare l’invito',
      deltaGood: count('invited') === 0,
      tone: 'amber',
    },
    { label: 'In pausa', value: String(count('paused')), tone: 'neutral' },
    { label: 'Conclusi', value: String(count('ended')), tone: 'rose' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clienti"
        subtitle={
          demo
            ? 'Stessa sezione clienti, compilata con dati demo: perfetta da mostrare in call.'
            : 'Il tuo roster: chi sta lavorando, chi deve ancora entrare, chi ha chiuso il percorso.'
        }
        actions={
          demo ? (
            <>
              <Badge color="accent">Demo</Badge>
              <Link href="/clienti" className={cn(buttonSecondary, 'min-h-[44px]')}>
                Torna ai dati reali
              </Link>
            </>
          ) : (
            <>
              <Link href="/clienti?demo=1" className={cn(buttonSecondary, 'min-h-[44px]')}>
                Vedi con dati demo
                <ArrowUpRight size={16} aria-hidden />
              </Link>
              <InviteClientForm />
            </>
          )
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          emoji="👥"
          title="Il roster è ancora vuoto"
          description="Invita il tuo primo atleta con il bottone qui sopra: riceverà l'invito per l'app, compilerà il questionario iniziale e comparirà qui con programma, nutrizione e check-in."
          action={
            <Link href="/clienti?demo=1" className={cn(buttonSecondary, 'min-h-[44px]')}>
              Guarda com’è con dati demo
              <ArrowUpRight size={16} aria-hidden />
            </Link>
          }
        />
      ) : (
        <>
          {/* ---------- Il polso del roster ---------- */}
          <section aria-label="Composizione del roster" className="grid grid-cols-2 gap-4 md:grid-cols-4">
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

          {/* ---------- IL FARO: il roster, riga per riga ---------- */}
          <Card beacon className="rise rise-3 overflow-hidden p-0">
            <div className="flex flex-wrap items-start justify-between gap-3 px-6 pb-4 pt-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <Users size={19} className="shrink-0 text-text-secondary" aria-hidden />
                  <h2 className="text-[17px] font-bold text-white">Il tuo roster</h2>
                </div>
                <p className="mt-1 text-[13px] text-text-secondary">
                  Dal più recente. Apri una scheda per programma, nutrizione, check-in e biofeedback.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-raised px-3 py-1.5 text-[13px] font-bold tnum text-white">
                {rows.length} {rows.length === 1 ? 'cliente' : 'clienti'}
              </span>
            </div>

            {/* Tabella densa da 768px in su */}
            <table className="hidden w-full border-t border-line/60 text-left md:table">
              <thead>
                <tr className="border-b border-line/60">
                  <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                    Cliente
                  </th>
                  <th className="px-4 py-3.5 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                    Stato
                  </th>
                  <th className="hidden px-4 py-3.5 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary lg:table-cell">
                    In carico dal
                  </th>
                  <th className="px-6 py-3.5 text-right text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                    Scheda
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
                      <td className="px-4 py-4">
                        <Badge color={meta.color}>
                          <Icon size={12} className="mr-1.5" aria-hidden />
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-4 text-[15px] tnum text-text-secondary lg:table-cell">
                        {formatDate(row.startedAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={row.href}
                          aria-label={`Apri la scheda di ${row.name}`}
                          className="press inline-flex min-h-[44px] items-center gap-1 rounded-full px-3 text-[15px] font-semibold text-accent transition hover:text-accent-hover"
                        >
                          Apri scheda
                          <ChevronRight size={16} aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Sotto 768px ogni riga diventa una card */}
            <ul className="border-t border-line/60 md:hidden">
              {rows.map((row) => {
                const meta = STATUS_META[row.status];
                const Icon = meta.icon;
                return (
                  <li key={row.id} className="border-b border-line/40 last:border-b-0">
                    <Link
                      href={row.href}
                      aria-label={`Apri la scheda di ${row.name}`}
                      className="press flex items-center gap-3.5 px-5 py-4 transition hover:bg-raised"
                    >
                      <span
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-raised text-[15px] font-bold text-white"
                        aria-hidden
                      >
                        {row.initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[17px] font-bold text-white">{row.name}</span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-2">
                          <Badge color={meta.color}>
                            <Icon size={12} className="mr-1.5" aria-hidden />
                            {meta.label}
                          </Badge>
                          <span className="truncate text-[13px] text-text-secondary">{row.detail}</span>
                        </span>
                      </span>
                      <ChevronRight size={18} className="shrink-0 text-text-tertiary" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
