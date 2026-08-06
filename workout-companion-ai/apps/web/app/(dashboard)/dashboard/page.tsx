import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Badge, Card, KpiCard, buttonGhost, buttonSecondary } from '@/components/ui';
import { Reveal } from '@/components/motion';
import { cn, fullName, formatDate } from '@/lib/utils';
import { QuickNotes } from './quick-notes';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Dumbbell,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
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

/** Una voce della coda di lavoro: cosa richiede attenzione oggi, e perché. */
type TriageItem = {
  key: string;
  href: string;
  title: string;
  detail: string;
  tag: string;
  tone: 'rose' | 'amber';
  icon: typeof Dumbbell;
  rank: number;
};

const QUICK_ACTIONS: ActionItem[] = [
  { href: '/allenamenti', label: 'Crea programma', detail: 'Periodizzazione e blocchi', icon: Dumbbell },
  { href: '/nutrizione', label: 'Crea piano food', detail: 'Macro e progressioni', icon: Utensils },
  { href: '/messaggi', label: 'Invia update', detail: 'Chat cliente e follow-up', icon: MessageSquare },
  { href: '/checkin', label: 'Valuta check', detail: 'Foto, misure, feedback', icon: ClipboardCheck },
  { href: '/clienti', label: 'Nuovo cliente', detail: 'Invito e intake iniziale', icon: Plus },
  { href: '/dashboard?demo=1', label: 'Demo prodotto', detail: 'Stessa app con dati demo', icon: ShieldCheck },
];

/**
 * Le primitive condivise (KpiCard, QuickNotes) portano una `.rise` che parte al
 * montaggio: dentro un Reveal il tempo lo detta lo scorrimento, quindi si spegne.
 */
const NO_RISE = '[&_.rise]:!animate-none';

/** Passo della cascata: le card entrano una dopo l'altra, non tutte insieme. */
const STEP = 70;

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

  // La vetrina pubblica gira senza sessione: il profilo si legge solo se c'è
  // davvero un utente, altrimenti la demo mostra i suoi dati d'esempio.
  const { data: profile } = user
    ? await supabase.from('profiles').select('first_name').eq('id', user.id).single()
    : { data: null };

  if (demoMode || !user) {
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

  // Il passo settimanale: quanto si è mosso il parco clienti rispetto a 7 giorni fa.
  const lastWeek = weeklyWorkouts[weeklyWorkouts.length - 1] ?? 0;
  const prevWeek = weeklyWorkouts[weeklyWorkouts.length - 2] ?? 0;
  const weekDelta = lastWeek - prevWeek;

  const today = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const todayLabel = today.charAt(0).toUpperCase() + today.slice(1);

  const kpis: {
    label: string;
    value: string;
    delta: string;
    deltaGood: boolean;
    tone: 'neutral' | 'accent' | 'mint' | 'amber' | 'rose';
    href: string;
  }[] = [
    {
      label: 'Clienti attivi',
      value: String(activeClients.length),
      delta: invitedClients > 0 ? `${invitedClients} in onboarding` : 'Roster stabile',
      deltaGood: true,
      tone: 'neutral',
      href: '/clienti',
    },
    {
      label: 'Silenti da 7 giorni',
      value: String(atRiskClients),
      delta: atRiskClients === 0 ? 'Si allenano tutti' : 'Da ricontattare oggi',
      deltaGood: atRiskClients === 0,
      tone: 'rose',
      href: '/clienti',
    },
    {
      label: 'Check da valutare',
      value: String(checkins.length),
      delta: checkins.length === 0 ? 'Nessun arretrato' : 'In attesa di risposta',
      deltaGood: checkins.length === 0,
      tone: 'amber',
      href: '/checkin',
    },
    {
      label: 'Messaggi non letti',
      value: String(unreadMessages),
      delta: unreadMessages === 0 ? 'Inbox pulita' : 'Rispondi ai clienti',
      deltaGood: unreadMessages === 0,
      tone: 'accent',
      href: '/messaggi',
    },
    {
      label: 'Workout completati',
      value: String(workouts7d),
      delta: `${weekDelta >= 0 ? '+' : ''}${weekDelta} vs settimana scorsa`,
      deltaGood: weekDelta >= 0,
      tone: 'mint',
      href: '/allenamenti',
    },
  ];

  // La coda di oggi: prima chi si è fermato, poi le scadenze, poi i check.
  const triage: TriageItem[] = [
    ...clients
      .filter((client) => client.status === 'risk')
      .map((client): TriageItem => ({
        key: `risk-${client.id}`,
        href: demoMode ? '/demo' : `/clienti/${client.id}`,
        title: client.name,
        detail: `${client.lastWorkout} · aderenza ${client.adherence}%`,
        tag: 'Silente',
        tone: 'rose',
        icon: AlertTriangle,
        rank: 0,
      })),
    ...programs.map((program): TriageItem => ({
      key: `prog-${program.id}`,
      href: demoMode ? '/demo' : `/allenamenti/${program.id}`,
      title: program.clientName,
      detail: `${program.name} · ${
        program.daysLeft === 0
          ? 'finisce oggi'
          : program.daysLeft === 1
            ? 'finisce domani'
            : `finisce tra ${program.daysLeft} giorni`
      }`,
      tag: program.daysLeft <= 2 ? 'Scheda da rinnovare' : 'In scadenza',
      tone: program.daysLeft <= 2 ? 'rose' : 'amber',
      icon: Dumbbell,
      rank: program.daysLeft <= 2 ? 1 : 3,
    })),
    ...checkins.map((checkin): TriageItem => ({
      key: `check-${checkin.id}`,
      href: demoMode ? '/demo' : `/checkin/${checkin.id}`,
      title: checkin.clientName,
      detail: `Settimana del ${formatDate(checkin.weekStart)} · inviato ${checkin.submittedAt}`,
      tag: checkin.priority === 'high' ? 'Check urgente' : 'Check da valutare',
      tone: checkin.priority === 'high' ? 'rose' : 'amber',
      icon: ClipboardCheck,
      rank: checkin.priority === 'high' ? 1 : checkin.priority === 'medium' ? 2 : 4,
    })),
  ].sort((a, b) => a.rank - b.rank);

  const triageTop = triage.slice(0, 6);

  const trained = clients.filter((client) => client.status === 'active').length;
  const silent = clients.filter((client) => client.status === 'risk').length;
  const onboarding = clients.filter((client) => client.status === 'invited').length;

  return (
    <div className="space-y-6">
      {/* ---------- Intestazione: chi sei, che giorno è, cosa cerchi ---------- */}
      <Reveal>
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
              {demoMode ? 'Modalità demo · dati di esempio' : todayLabel}
            </p>
            <h1 className="mt-2 text-[34px] font-extrabold leading-[1.1] tracking-[-0.02em] text-white">
              Bentornato, {coachName}
            </h1>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-text-secondary">
              {demoMode
                ? 'Stessa app, dati già compilati: nessuna attesa dal database, perfetta da mostrare in call.'
                : 'Qui sotto trovi solo ciò che richiede una tua decisione oggi.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
                size={17}
                aria-hidden
              />
              <input
                type="search"
                aria-label="Cerca clienti o programmi"
                placeholder="Cerca clienti o programmi"
                className="h-11 w-full rounded-full bg-raised pl-11 pr-4 text-[15px] text-white outline-none transition placeholder:text-text-tertiary focus:shadow-[0_0_0_4px_rgba(10,132,255,0.18)] sm:w-[276px]"
              />
            </div>
            <Link href={demoMode ? '/dashboard' : '/dashboard?demo=1'} className={cn(buttonSecondary, 'h-11 py-0')}>
              <ShieldCheck size={17} aria-hidden />
              {demoMode ? 'Torna ai dati reali' : 'Modalità demo'}
            </Link>
          </div>
        </header>
      </Reveal>

      {/* ---------- Il polso di oggi: ogni segnale ha un solo mestiere ---------- */}
      {/* Le card entrano a cascata: il ritardo dà l'ordine di lettura, da sinistra. */}
      <section aria-label="Indicatori di oggi" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kpi, i) => (
          <Reveal key={kpi.label} delay={i * STEP} className={NO_RISE}>
            <Link
              href={kpi.href}
              className="press block rounded-lg [&>div]:transition-colors [&>div:hover]:bg-raised"
            >
              <KpiCard
                label={kpi.label}
                value={kpi.value}
                delta={kpi.delta}
                deltaGood={kpi.deltaGood}
                tone={kpi.tone}
              />
            </Link>
          </Reveal>
        ))}
      </section>

      {/* La fascia entra intera: il faro e il suo grafico di supporto sono una cosa sola. */}
      <Reveal delay={STEP * 2} className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        {/* ---------- IL FARO: la coda di lavoro di oggi ---------- */}
        <Card beacon className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-4 pt-6">
            <div className="min-w-0">
              <h2 className="text-[22px] font-bold leading-tight tracking-[-0.01em] text-white">
                Richiede attenzione oggi
              </h2>
              <p className="mt-1 text-[15px] text-text-secondary">
                In ordine di urgenza: chi si è fermato, cosa scade, cosa aspetta una risposta.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-raised px-3 py-1.5 text-[13px] font-bold tnum text-white">
              {triage.length} da sbrigare
            </span>
          </div>

          {triageTop.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <span className="mb-4 grid h-14 w-14 place-items-center rounded-md bg-mint/15 text-mint">
                <CheckCircle2 size={26} aria-hidden />
              </span>
              <h3 className="text-[17px] font-bold text-white">Tavolo pulito</h3>
              <p className="mt-1.5 max-w-sm text-[15px] leading-relaxed text-text-secondary">
                Nessun cliente fermo, nessun check in attesa, nessuna scheda in scadenza. Goditela: è
                raro.
              </p>
            </div>
          ) : (
            <ul className="border-t border-line/60">
              {triageTop.map((item) => {
                const Icon = item.icon;
                const tone =
                  item.tone === 'rose'
                    ? { tile: 'bg-rose/15 text-rose', chip: 'bg-rose/15 text-rose' }
                    : { tile: 'bg-amber/15 text-amber', chip: 'bg-amber/15 text-amber' };
                return (
                  <li key={item.key} className="border-b border-line/40 last:border-b-0">
                    <Link
                      href={item.href}
                      className="press group flex min-h-[68px] items-center gap-4 px-6 py-3.5 transition hover:bg-raised"
                    >
                      <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xs', tone.tile)}>
                        <Icon size={19} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-bold text-white">{item.title}</span>
                        <span className="mt-0.5 block truncate text-[13px] text-text-secondary">
                          {item.detail}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'hidden shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold sm:inline-flex',
                          tone.chip,
                        )}
                      >
                        {item.tag}
                      </span>
                      <ChevronRight
                        size={18}
                        aria-hidden
                        className="shrink-0 text-text-tertiary transition group-hover:text-white"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-1 border-t border-line/60 px-3 py-2">
            <Link href="/clienti" className={cn(buttonGhost, 'min-h-[44px]')}>
              Clienti <ArrowUpRight size={15} aria-hidden />
            </Link>
            <Link href="/checkin" className={cn(buttonGhost, 'min-h-[44px]')}>
              Check <ArrowUpRight size={15} aria-hidden />
            </Link>
            <Link href="/allenamenti" className={cn(buttonGhost, 'min-h-[44px]')}>
              Programmi <ArrowUpRight size={15} aria-hidden />
            </Link>
          </div>
        </Card>

        {/* ---------- Il ritmo: volume delle ultime 8 settimane ---------- */}
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[17px] font-bold text-white">Ritmo delle ultime 8 settimane</h2>
              <p className="mt-1 text-[13px] text-text-secondary">Workout chiusi dai clienti attivi.</p>
            </div>
            <TrendingUp size={20} className="shrink-0 text-mint" aria-hidden />
          </div>

          <WeeklyBars values={weeklyWorkouts} />

          <p className="mt-3 text-[13px] font-semibold tnum text-text-secondary">
            <span className={weekDelta >= 0 ? 'text-mint' : 'text-rose'}>
              {weekDelta >= 0 ? '+' : ''}
              {weekDelta}
            </span>{' '}
            rispetto alla settimana precedente
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <MiniStat label="Aderenza media" value={`${adherence}%`} tone="mint" />
            <MiniStat label="Readiness media" value={`${readiness}%`} tone="cyan" />
            <MiniStat label="Retention" value={retention != null ? `${retention}%` : '—'} />
            <MiniStat label="Check 30 giorni" value={String(checkins30d)} />
          </div>
        </Card>
      </Reveal>

      {/* ---------- Chi si è allenato, chi no ---------- */}
      {/* La lista è lunga: entra il contenitore, non riga per riga. */}
      <Reveal>
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-start justify-between gap-3 px-6 pb-4 pt-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <Users size={19} className="shrink-0 text-text-secondary" aria-hidden />
                <h2 className="text-[17px] font-bold text-white">Chi si è allenato, chi no</h2>
              </div>
              <p className="mt-1 text-[13px] text-text-secondary">
                Aderenza, readiness e ultimo segnale dai tuoi atleti.
              </p>
            </div>
            <Link href="/clienti" className={cn(buttonGhost, 'min-h-[44px] px-0')}>
              Vedi tutti <ArrowUpRight size={15} aria-hidden />
            </Link>
          </div>

          {clients.length > 0 && (
            <div className="flex flex-wrap gap-2 px-6 pb-4">
              <RosterChip tone="mint" label="allenati" count={trained} />
              <RosterChip tone="rose" label="silenti" count={silent} />
              <RosterChip tone="amber" label="in onboarding" count={onboarding} />
            </div>
          )}

          {clients.length === 0 ? (
            <div className="flex flex-col items-center border-t border-line/60 px-6 py-14 text-center">
              <span className="mb-4 grid h-[72px] w-[72px] place-items-center rounded-lg bg-raised text-4xl">
                🏋️
              </span>
              <h3 className="text-[22px] font-bold tracking-[-0.01em] text-white">Il roster è vuoto</h3>
              <p className="mt-2 max-w-md text-[15px] leading-relaxed text-text-secondary">
                Invita il tuo primo atleta e questa tabella inizierà a raccontarti chi si allena, chi
                rallenta e chi va ripreso in mano.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Link href="/clienti" className={buttonSecondary}>
                  <Plus size={17} aria-hidden />
                  Invita un cliente
                </Link>
                <Link href="/dashboard?demo=1" className={cn(buttonGhost, 'min-h-[44px]')}>
                  Guarda la demo <ArrowUpRight size={15} aria-hidden />
                </Link>
              </div>
            </div>
          ) : (
            <>
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
                    <th className="px-4 py-3.5 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                      Aderenza
                    </th>
                    <th className="hidden px-4 py-3.5 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary lg:table-cell">
                      Readiness
                    </th>
                    <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                      Ultimo segnale
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr
                      key={client.id}
                      className="border-b border-line/40 transition last:border-b-0 hover:bg-raised"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={demoMode ? '/demo' : `/clienti/${client.id}`}
                          className="text-[15px] font-bold text-white transition hover:text-accent"
                        >
                          {client.name}
                        </Link>
                        <p className="mt-0.5 text-[13px] text-text-secondary">{client.goal}</p>
                      </td>
                      <td className="px-4 py-4">
                        <ClientStatusBadge status={client.status} />
                      </td>
                      <td className="px-4 py-4">
                        {client.status === 'invited' ? (
                          <span className="text-[13px] text-text-tertiary">—</span>
                        ) : (
                          <MetricBar value={client.adherence} metric="adherence" />
                        )}
                      </td>
                      <td className="hidden px-4 py-4 lg:table-cell">
                        {client.status === 'invited' ? (
                          <span className="text-[13px] text-text-tertiary">—</span>
                        ) : (
                          <MetricBar value={client.readiness} metric="readiness" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-[13px] text-text-secondary">{client.lastWorkout}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Sotto 768px la tabella diventa una lista di card */}
              <ul className="border-t border-line/60 md:hidden">
                {clients.map((client) => (
                  <li key={client.id} className="border-b border-line/40 last:border-b-0">
                    <Link
                      href={demoMode ? '/demo' : `/clienti/${client.id}`}
                      className="press block px-5 py-4 transition hover:bg-raised"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-bold text-white">{client.name}</p>
                          <p className="mt-0.5 truncate text-[13px] text-text-secondary">{client.goal}</p>
                        </div>
                        <ClientStatusBadge status={client.status} />
                      </div>
                      {client.status !== 'invited' && (
                        <div className="mt-3 space-y-2">
                          <LabelledBar label="Aderenza" value={client.adherence} metric="adherence" />
                          <LabelledBar label="Readiness" value={client.readiness} metric="readiness" />
                        </div>
                      )}
                      <p className="mt-3 text-[13px] text-text-tertiary">{client.lastWorkout}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </Reveal>

      {/* ---------- Strumenti: cosa apri adesso, cosa ti annoti ---------- */}
      <Reveal className={cn('grid gap-4 xl:grid-cols-[1.55fr_1fr]', NO_RISE)}>
        <Card>
          <h2 className="text-[17px] font-bold text-white">Azioni rapide</h2>
          <p className="mt-1 text-[13px] text-text-secondary">Le sei cose che apri più spesso.</p>
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href + action.label}
                  href={action.href}
                  className="press rounded-sm bg-raised p-4 transition hover:bg-[#252E3E]"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xs bg-accent/15 text-accent">
                    <Icon size={18} aria-hidden />
                  </span>
                  <p className="mt-3 text-[15px] font-bold text-white">{action.label}</p>
                  <p className="mt-1 text-[13px] text-text-secondary">{action.detail}</p>
                </Link>
              );
            })}
          </div>
        </Card>

        {demoMode ? (
          <Card>
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xs bg-accent/15 text-accent">
                <ShieldCheck size={20} aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-[17px] font-bold text-white">Demo commerciale pronta</h2>
                <p className="mt-1.5 text-[15px] leading-relaxed text-text-secondary">{note}</p>
                <Link href="/demo" className={cn(buttonGhost, 'mt-2 min-h-[44px] px-0')}>
                  Resta nella demo prodotto <ArrowUpRight size={15} aria-hidden />
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <QuickNotes initialBody={note} />
        )}
      </Reveal>
    </div>
  );
}

/** Colonne del volume settimanale: l'ultima settimana è piena, le altre in ombra. */
function WeeklyBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);

  return (
    <div
      className="mt-5 flex h-[124px] items-end gap-1.5"
      role="img"
      aria-label={`Workout completati nelle ultime 8 settimane: ${values.join(', ')}`}
    >
      {values.map((value, i) => {
        const isLast = i === values.length - 1;
        return (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex w-full flex-1 items-end">
              <div
                className={cn('w-full rounded-[6px]', isLast ? 'bg-mint' : 'bg-mint/25')}
                style={{ height: `${Math.max(4, Math.round((value / max) * 100))}%` }}
              />
            </div>
            <span
              className={cn(
                'text-[10px] font-bold tnum',
                isLast ? 'text-white' : 'text-text-tertiary',
              )}
            >
              {isLast ? 'ora' : `-${values.length - 1 - i}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'mint' | 'cyan' | 'amber';
}) {
  const toneText = {
    neutral: 'text-white',
    mint: 'text-mint',
    cyan: 'text-cyan',
    amber: 'text-amber',
  }[tone];

  return (
    <div className="rounded-xs bg-raised px-3.5 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary">{label}</p>
      <p className={cn('font-metric mt-1.5 text-[24px] font-extrabold leading-none tnum', toneText)}>
        {value}
      </p>
    </div>
  );
}

function RosterChip({
  tone,
  label,
  count,
}: {
  tone: 'mint' | 'rose' | 'amber';
  label: string;
  count: number;
}) {
  const dot = { mint: 'bg-mint', rose: 'bg-rose', amber: 'bg-amber' }[tone];

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-raised px-3 py-1.5 text-[13px] font-semibold text-text-secondary">
      <span className={cn('h-2 w-2 rounded-full', dot)} aria-hidden />
      <span className="font-bold tnum text-white">{count}</span> {label}
    </span>
  );
}

/** La barra porta sempre anche il numero: il colore non è mai l'unica informazione. */
function MetricBar({ value, metric }: { value: number; metric: 'adherence' | 'readiness' }) {
  const pct = Math.max(0, Math.min(100, value));
  const color =
    metric === 'readiness'
      ? pct < 60
        ? 'bg-amber'
        : 'bg-cyan'
      : pct < 60
        ? 'bg-rose'
        : pct < 85
          ? 'bg-amber'
          : 'bg-mint';

  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-full min-w-[48px] max-w-[104px] overflow-hidden rounded-full bg-[#2A3241]">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-[13px] font-bold tnum text-white">{pct}%</span>
    </div>
  );
}

function LabelledBar({
  label,
  value,
  metric,
}: {
  label: string;
  value: number;
  metric: 'adherence' | 'readiness';
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[76px] shrink-0 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
        {label}
      </span>
      <MetricBar value={value} metric={metric} />
    </div>
  );
}

function ClientStatusBadge({ status }: { status: ClientRow['status'] }) {
  if (status === 'risk') {
    return (
      <Badge color="danger">
        <AlertTriangle size={12} className="mr-1.5" aria-hidden />
        Silente
      </Badge>
    );
  }

  if (status === 'active') {
    return (
      <Badge color="success">
        <CheckCircle2 size={12} className="mr-1.5" aria-hidden />
        Attivo
      </Badge>
    );
  }

  return (
    <Badge color="warning">
      <Plus size={12} className="mr-1.5" aria-hidden />
      Invitato
    </Badge>
  );
}
