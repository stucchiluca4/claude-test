import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui';
import { Sparkline } from '@/components/sparkline';
import { fullName, formatDate } from '@/lib/utils';
import { QuickNotes } from './quick-notes';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  ClipboardCheck,
  Dumbbell,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  Utensils,
} from 'lucide-react';

type DashboardPageProps = {
  searchParams: Promise<{ demo?: string }>;
};

type ActionItem = {
  href: string;
  label: string;
  detail: string;
  icon: typeof Dumbbell;
};

type ClientRow = {
  id: string;
  name: string;
  goal: string;
  status: 'active' | 'invited' | 'risk';
  adherence: number;
  readiness: number;
  lastWorkout: string;
};

type ProgramRow = {
  id: string;
  name: string;
  clientName: string;
  daysLeft: number;
  phase: string;
};

type CheckinRow = {
  id: string;
  clientName: string;
  weekStart: string;
  submittedAt: string;
  priority: 'high' | 'medium' | 'low';
};

const QUICK_ACTIONS: ActionItem[] = [
  { href: '/allenamenti', label: 'Crea programma', detail: 'Periodizzazione e blocchi', icon: Dumbbell },
  { href: '/nutrizione', label: 'Crea piano food', detail: 'Macro e progressioni', icon: Utensils },
  { href: '/messaggi', label: 'Invia update', detail: 'Chat cliente e follow-up', icon: MessageSquare },
  { href: '/checkin', label: 'Valuta check', detail: 'Foto, misure, feedback', icon: ClipboardCheck },
  { href: '/clienti', label: 'Nuovo cliente', detail: 'Invito e intake iniziale', icon: Plus },
  { href: '/demo', label: 'Demo vendita', detail: 'Mockup premium Stitch', icon: ShieldCheck },
];

const DEMO_CLIENTS: ClientRow[] = [
  {
    id: 'demo-marco',
    name: 'Marco Bellini',
    goal: 'Ipertrofia lean bulk',
    status: 'active',
    adherence: 94,
    readiness: 86,
    lastWorkout: 'Oggi, Upper Strength',
  },
  {
    id: 'demo-giulia',
    name: 'Giulia Rinaldi',
    goal: 'Ricomp. + glute focus',
    status: 'active',
    adherence: 91,
    readiness: 78,
    lastWorkout: 'Ieri, Lower Hypertrophy',
  },
  {
    id: 'demo-andrea',
    name: 'Andrea Costa',
    goal: 'Forza su squat',
    status: 'risk',
    adherence: 68,
    readiness: 54,
    lastWorkout: '6 giorni fa',
  },
  {
    id: 'demo-sofia',
    name: 'Sofia Marino',
    goal: 'Dimagrimento sostenibile',
    status: 'invited',
    adherence: 0,
    readiness: 0,
    lastWorkout: 'Onboarding in corso',
  },
];

const DEMO_PROGRAMS: ProgramRow[] = [
  { id: 'prog-1', name: 'Hypertrophy Engine W5', clientName: 'Marco Bellini', daysLeft: 2, phase: 'Overload' },
  { id: 'prog-2', name: 'Glute Focus 12W', clientName: 'Giulia Rinaldi', daysLeft: 5, phase: 'Volume' },
  { id: 'prog-3', name: 'Strength Reset', clientName: 'Andrea Costa', daysLeft: 7, phase: 'Deload' },
];

const DEMO_CHECKINS: CheckinRow[] = [
  { id: 'check-1', clientName: 'Andrea Costa', weekStart: '2026-07-20', submittedAt: 'Oggi 08:12', priority: 'high' },
  { id: 'check-2', clientName: 'Marco Bellini', weekStart: '2026-07-20', submittedAt: 'Ieri 21:40', priority: 'medium' },
  { id: 'check-3', clientName: 'Giulia Rinaldi', weekStart: '2026-07-20', submittedAt: 'Ieri 18:05', priority: 'low' },
];

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { demo } = await searchParams;
  const demoMode = demo === '1' || demo === 'true';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user!.id)
    .single();

  if (demoMode) {
    return (
      <DashboardControlRoom
        coachName={profile?.first_name ?? 'Coach'}
        demoMode
        clients={DEMO_CLIENTS}
        programs={DEMO_PROGRAMS}
        checkins={DEMO_CHECKINS}
        unreadMessages={12}
        checkins30d={38}
        workouts7d={126}
        retention={96}
        weeklyWorkouts={[82, 89, 94, 101, 108, 117, 121, 126]}
        note="Demo pronta per call commerciale: mostra dashboard, programmi, nutrizione, biofeedback e app atleta."
      />
    );
  }

  const [
    { data: clients },
    { data: activePrograms },
    { data: pendingCheckins },
    { count: unreadMessages },
    { data: recentLogs },
    { data: monthCheckins },
    { data: note },
  ] = await Promise.all([
    supabase
      .from('coach_clients')
      .select(
        'id, status, created_at, started_at, client:profiles!coach_clients_client_id_fkey(id, first_name, last_name)'
      )
      .eq('coach_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('programs')
      .select(
        'id, name, start_date, duration_weeks, coach_client:coach_clients!inner(coach_id, client:profiles!coach_clients_client_id_fkey(first_name, last_name))'
      )
      .eq('coach_client.coach_id', user!.id)
      .eq('status', 'active')
      .not('start_date', 'is', null),
    supabase
      .from('checkins')
      .select(
        'id, week_start, submitted_at, coach_client:coach_clients!inner(coach_id, client:profiles!coach_clients_client_id_fkey(first_name, last_name))'
      )
      .eq('coach_client.coach_id', user!.id)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .limit(6),
    supabase
      .from('messages')
      .select('id, conversation:conversations!inner(coach_client:coach_clients!inner(coach_id))', {
        count: 'exact',
        head: true,
      })
      .eq('conversation.coach_client.coach_id', user!.id)
      .neq('sender_id', user!.id)
      .neq('status', 'read'),
    supabase
      .from('workout_logs')
      .select('client_id, started_at, completed_at')
      .gte('started_at', new Date(Date.now() - 56 * 24 * 3600 * 1000).toISOString())
      .order('started_at', { ascending: false }),
    supabase
      .from('checkins')
      .select('id, coach_client:coach_clients!inner(coach_id)')
      .eq('coach_client.coach_id', user!.id)
      .in('status', ['submitted', 'reviewed'])
      .gte('week_start', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)),
    supabase.from('quick_notes').select('body').eq('coach_id', user!.id).maybeSingle(),
  ]);

  const allClients = clients ?? [];
  const activeClients = allClients.filter((c) => c.status === 'active');
  const invitedClients = allClients.filter((c) => c.status === 'invited');
  const endedClients = allClients.filter((c) => c.status === 'ended');

  const clientIds = new Set(activeClients.map((c) => (c.client as any)?.id).filter(Boolean));
  const myLogs = (recentLogs ?? []).filter((l) => clientIds.has(l.client_id));

  const today = Date.now();
  const weekAgo = today - 7 * 24 * 3600 * 1000;
  const activeLastWeek = new Set(
    myLogs.filter((l) => new Date(l.started_at).getTime() >= weekAgo).map((l) => l.client_id)
  );
  const atRisk = activeClients.filter(
    (c) => (c.client as any)?.id && !activeLastWeek.has((c.client as any).id)
  );

  const programs = (activePrograms ?? [])
    .map((p) => {
      const end = new Date(p.start_date!).getTime() + p.duration_weeks * 7 * 24 * 3600 * 1000;
      return {
        id: p.id,
        name: p.name,
        clientName: fullName((p.coach_client as any)?.client ?? null),
        daysLeft: Math.ceil((end - today) / (24 * 3600 * 1000)),
        phase: `${p.duration_weeks} settimane`,
      };
    })
    .filter((p) => p.daysLeft >= 0 && p.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const weeklyWorkouts = Array.from({ length: 8 }, (_, i) => {
    const start = today - (8 - i) * 7 * 24 * 3600 * 1000;
    const end = start + 7 * 24 * 3600 * 1000;
    return myLogs.filter((l) => {
      const t = new Date(l.started_at).getTime();
      return t >= start && t < end;
    }).length;
  });

  const retention =
    activeClients.length + endedClients.length > 0
      ? Math.round((activeClients.length / (activeClients.length + endedClients.length)) * 100)
      : null;

  const clientRows: ClientRow[] = allClients.slice(0, 5).map((c) => {
    const client = c.client as any;
    const isRisk = c.status === 'active' && client?.id && !activeLastWeek.has(client.id);
    return {
      id: c.id,
      name: client ? fullName(client) : 'Invito inviato',
      goal: c.status === 'invited' ? 'Onboarding da completare' : 'Coaching attivo',
      status: isRisk ? 'risk' : c.status === 'active' ? 'active' : 'invited',
      adherence: isRisk ? 62 : c.status === 'active' ? 88 : 0,
      readiness: isRisk ? 51 : c.status === 'active' ? 82 : 0,
      lastWorkout: isRisk ? 'Nessun workout da 7gg' : c.status === 'active' ? 'Attivo questa settimana' : 'In attesa',
    };
  });

  const checkins: CheckinRow[] = (pendingCheckins ?? []).map((ci) => ({
    id: ci.id,
    clientName: fullName((ci.coach_client as any)?.client ?? null),
    weekStart: ci.week_start,
    submittedAt: formatDate(ci.submitted_at),
    priority: 'medium',
  }));

  return (
    <DashboardControlRoom
      coachName={profile?.first_name ?? 'Coach'}
      clients={clientRows}
      programs={programs}
      checkins={checkins}
      unreadMessages={unreadMessages ?? 0}
      checkins30d={monthCheckins?.length ?? 0}
      workouts7d={myLogs.filter((l) => new Date(l.started_at).getTime() >= weekAgo).length}
      retention={retention}
      weeklyWorkouts={weeklyWorkouts}
      note={note?.body ?? ''}
      invitedClients={invitedClients.length}
      atRiskClients={atRisk.length}
    />
  );
}

function DashboardControlRoom({
  coachName,
  demoMode = false,
  clients,
  programs,
  checkins,
  unreadMessages,
  checkins30d,
  workouts7d,
  retention,
  weeklyWorkouts,
  note,
  invitedClients = 1,
  atRiskClients = clients.filter((client) => client.status === 'risk').length,
}: {
  coachName: string;
  demoMode?: boolean;
  clients: ClientRow[];
  programs: ProgramRow[];
  checkins: CheckinRow[];
  unreadMessages: number;
  checkins30d: number;
  workouts7d: number;
  retention: number | null;
  weeklyWorkouts: number[];
  note: string;
  invitedClients?: number;
  atRiskClients?: number;
}) {
  const activeClients = clients.filter((client) => client.status === 'active' || client.status === 'risk');
  const adherence =
    activeClients.length > 0
      ? Math.round(activeClients.reduce((sum, client) => sum + client.adherence, 0) / activeClients.length)
      : 0;
  const readiness =
    activeClients.length > 0
      ? Math.round(activeClients.reduce((sum, client) => sum + client.readiness, 0) / activeClients.length)
      : 0;

  const kpis = [
    { label: 'Clienti attivi', value: String(activeClients.length), detail: `${invitedClients} onboarding`, icon: Users },
    { label: 'Workout 7 giorni', value: String(workouts7d), detail: 'Volume operativo', icon: Dumbbell },
    { label: 'Aderenza media', value: `${adherence}%`, detail: demoMode ? '+7% vs mese scorso' : 'Ultimi clienti attivi', icon: Target },
    { label: 'Readiness media', value: `${readiness}%`, detail: `${atRiskClients} alert da leggere`, icon: Activity },
    { label: 'Retention', value: retention != null ? `${retention}%` : '-', detail: 'Attivi vs conclusi', icon: TrendingUp },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#151920] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-secondary">
            {demoMode ? 'Preview app integrata' : 'Elite coaching control room'}
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">
            Bentornato, {coachName}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {demoMode
              ? 'Questa e la dashboard reale in modalita demo. I menu aprono la vetrina veloce con le schermate complete.'
              : 'Priorita operative, performance clienti e prossime azioni in un unico quadro.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input
              className="h-10 w-64 rounded-full border border-white/10 bg-background px-9 text-sm outline-none transition focus:border-accent"
              placeholder="Cerca clienti o programmi"
            />
          </div>
          <Link
            href={demoMode ? '/dashboard' : '/dashboard?demo=1'}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-celeste transition hover:bg-white/5"
          >
            {demoMode ? 'Dati reali' : 'Modalita demo'}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.label === 'Clienti attivi' ? '/clienti' : '/dashboard'}
              className="rounded-xl border border-white/10 bg-[#151920] p-4 transition hover:border-accent/50 hover:bg-card-hover"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">
                  {kpi.label}
                </span>
                <Icon className="text-celeste" size={18} />
              </div>
              <p className="mt-3 text-3xl font-black text-white">{kpi.value}</p>
              <p className="mt-1 text-xs text-text-secondary">{kpi.detail}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
        <section className="rounded-xl border border-white/10 bg-[#151920]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="font-bold text-white">Atleti in gestione</h2>
              <p className="text-xs text-text-secondary">Aderenza, readiness e ultimo segnale operativo.</p>
            </div>
            <Link href="/clienti" className="flex items-center gap-1 text-xs font-bold text-celeste">
              Vedi tutti <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.12em] text-text-secondary">
                <tr className="border-b border-white/10">
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Stato</th>
                  <th className="px-5 py-3">Aderenza</th>
                  <th className="px-5 py-3">Readiness</th>
                  <th className="px-5 py-3">Ultimo workout</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-text-secondary">
                      Nessun cliente ancora. Attiva la modalita demo o invita il primo cliente.
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr key={client.id} className="border-b border-white/5 hover:bg-white/[.03]">
                      <td className="px-5 py-4">
                        <Link href={demoMode ? '/demo' : `/clienti/${client.id}`} className="font-bold text-white hover:text-celeste">
                          {client.name}
                        </Link>
                        <p className="text-xs text-text-secondary">{client.goal}</p>
                      </td>
                      <td className="px-5 py-4">
                        <ClientStatusBadge status={client.status} />
                      </td>
                      <td className="px-5 py-4">
                        <MetricBar value={client.adherence} />
                      </td>
                      <td className="px-5 py-4">
                        <MetricBar value={client.readiness} tone={client.readiness < 60 ? 'warning' : 'accent'} />
                      </td>
                      <td className="px-5 py-4 text-text-secondary">{client.lastWorkout}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#151920] p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold text-white">Performance 8 settimane</h2>
              <p className="text-xs text-text-secondary">Workout completati dai clienti attivi.</p>
            </div>
            <BarChart3 className="text-celeste" size={22} />
          </div>
          <div className="mt-5">
            <Sparkline values={weeklyWorkouts} color="#4cd7f6" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <MiniStat label="Check 30gg" value={String(checkins30d)} />
            <MiniStat label="Messaggi" value={String(unreadMessages)} />
            <MiniStat label="Programmi in scadenza" value={String(programs.length)} />
            <MiniStat label="Alert rischio" value={String(atRiskClients)} danger={atRiskClients > 0} />
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Priorita coach" href="/checkin">
          <div className="space-y-3">
            {checkins.length === 0 ? (
              <p className="text-sm text-text-secondary">Nessun check in attesa.</p>
            ) : (
              checkins.map((checkin) => (
                <Link
                  key={checkin.id}
                  href={demoMode ? '/demo' : `/checkin/${checkin.id}`}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-background/60 px-3 py-3 transition hover:border-accent/50"
                >
                  <span>
                    <span className="block text-sm font-bold text-white">{checkin.clientName}</span>
                    <span className="block text-xs text-text-secondary">
                      Settimana {checkin.weekStart} - {checkin.submittedAt}
                    </span>
                  </span>
                  <Priority priority={checkin.priority} />
                </Link>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Programmi in scadenza" href="/allenamenti">
          <div className="space-y-3">
            {programs.length === 0 ? (
              <p className="text-sm text-text-secondary">Nessun programma in scadenza.</p>
            ) : (
              programs.slice(0, 4).map((program) => (
                <Link
                  key={program.id}
                  href={demoMode ? '/demo' : `/allenamenti/${program.id}`}
                  className="block rounded-lg border border-white/10 bg-background/60 px-3 py-3 transition hover:border-accent/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-white">{program.clientName}</span>
                    <span className={program.daysLeft <= 2 ? 'text-xs font-bold text-danger' : 'text-xs font-bold text-warning'}>
                      {program.daysLeft}g
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">{program.name} - {program.phase}</p>
                </Link>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Azioni rapide">
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href + action.label}
                  href={action.href}
                  className="rounded-lg border border-white/10 bg-background/60 p-3 transition hover:border-accent/50 hover:bg-card-hover"
                >
                  <Icon className="text-celeste" size={18} />
                  <p className="mt-2 text-sm font-bold text-white">{action.label}</p>
                  <p className="mt-1 text-xs text-text-secondary">{action.detail}</p>
                </Link>
              );
            })}
          </div>
        </Panel>
      </div>

      {demoMode ? (
        <div className="rounded-xl border border-[#1e5af0]/40 bg-[#1e5af0]/10 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 text-celeste" size={22} />
            <div>
              <h2 className="font-bold text-white">Demo commerciale pronta</h2>
              <p className="mt-1 text-sm text-text-secondary">{note}</p>
              <Link href="/demo" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-celeste">
                Apri tutte le schermate Stitch <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <QuickNotes initialBody={note} />
      )}
    </div>
  );
}

function Panel({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#151920] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold text-white">{title}</h2>
        {href && (
          <Link href={href} className="flex items-center gap-1 text-xs font-bold text-celeste">
            Apri <ArrowUpRight size={14} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function MiniStat({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 bg-background/60 p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">{label}</p>
      <p className={danger ? 'mt-1 text-2xl font-black text-danger' : 'mt-1 text-2xl font-black text-white'}>
        {value}
      </p>
    </div>
  );
}

function MetricBar({ value, tone = 'accent' }: { value: number; tone?: 'accent' | 'warning' }) {
  const color = tone === 'warning' ? 'bg-warning' : 'bg-celeste';

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="w-9 text-right text-xs font-bold text-white">{value}%</span>
    </div>
  );
}

function ClientStatusBadge({ status }: { status: ClientRow['status'] }) {
  if (status === 'risk') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-danger/25 bg-danger/15 px-2 py-0.5 text-xs font-bold text-danger">
        <AlertTriangle size={12} /> Rischio
      </span>
    );
  }

  return (
    <Badge color={status === 'active' ? 'success' : 'warning'}>
      {status === 'active' ? 'Attivo' : 'Invitato'}
    </Badge>
  );
}

function Priority({ priority }: { priority: CheckinRow['priority'] }) {
  const className =
    priority === 'high'
      ? 'border-danger/25 bg-danger/15 text-danger'
      : priority === 'medium'
        ? 'border-warning/25 bg-warning/15 text-warning'
        : 'border-accent/25 bg-accent/15 text-accent';

  const label = priority === 'high' ? 'Alta' : priority === 'medium' ? 'Media' : 'Bassa';

  return <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${className}`}>{label}</span>;
}
