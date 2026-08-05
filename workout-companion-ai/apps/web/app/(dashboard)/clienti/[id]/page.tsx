import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Activity,
  Archive,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Dumbbell,
  PauseCircle,
  Ruler,
  TrendingUp,
  Utensils,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, Badge, KpiCard, buttonSecondary, buttonGhost } from '@/components/ui';
import { cn, fullName, formatDate, formatKg } from '@/lib/utils';
import { WeightChart } from '@/components/weight-chart';
import { AiCoachWidget } from '@/components/ai-coach-widget';

type StatusKey = 'active' | 'invited' | 'paused' | 'ended';

const STATUS_META: Record<
  StatusKey,
  { label: string; color: 'success' | 'warning' | 'default' | 'danger'; icon: typeof CheckCircle2 }
> = {
  active: { label: 'Attivo', color: 'success', icon: CheckCircle2 },
  invited: { label: 'Invitato', color: 'warning', icon: Clock3 },
  paused: { label: 'In pausa', color: 'default', icon: PauseCircle },
  ended: { label: 'Concluso', color: 'danger', icon: Archive },
};

const CHECK_META: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'default' }
> = {
  reviewed: { label: 'Rivisto', color: 'success' },
  submitted: { label: 'Da rivedere', color: 'warning' },
  pending: { label: 'In attesa', color: 'default' },
};

const KPI_DELAY = [
  '[&>div]:[animation-delay:0ms]',
  '[&>div]:[animation-delay:50ms]',
  '[&>div]:[animation-delay:100ms]',
  '[&>div]:[animation-delay:150ms]',
];

type Field = { label: string; value: string };
type LinkRow = { id: string; label: string; meta?: string; href: string };
type CheckRow = { id: string; label: string; meta: string; status: string; href: string };

/** Il dossier del cliente, in un'unica forma: dati reali e demo passano da qui. */
type Dossier = {
  id: string;
  demo: boolean;
  name: string;
  status: StatusKey;
  goal: string | null;
  startedAt: string | null;
  startedLabel: string;
  anagrafica: Field[];
  anamnesi: Field[] | null;
  weightSeries: { date: string; peso: number }[];
  programs: LinkRow[];
  activePrograms: number;
  plans: LinkRow[];
  checkins: CheckRow[];
  totalCheckins: number;
  pendingCheckins: number;
  actions: { program: string; nutrition: string; assessment: string; biofeedback: string };
};

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ demo?: string }>;
}) {
  const { id } = await params;
  const { demo } = await searchParams;

  if (demo === '1') {
    return <ClientDossier dossier={buildDemoDossier(id)} />;
  }

  const supabase = await createClient();

  const { data: cc } = await supabase
    .from('coach_clients')
    .select(
      'id, status, started_at, invite_email, client:profiles!coach_clients_client_id_fkey(id, first_name, last_name, sex, date_of_birth, height_cm)'
    )
    .eq('id', id)
    .single();

  if (!cc) notFound();

  const client = cc.client as any;

  const [{ data: intake }, { data: programs }, { data: plans }, { data: checkins }] =
    await Promise.all([
      supabase.from('client_intake').select('*').eq('coach_client_id', cc.id).maybeSingle(),
      supabase
        .from('programs')
        .select('id, name, goal, status, duration_weeks, start_date')
        .eq('coach_client_id', cc.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('nutrition_plans')
        .select('id, name, status, duration_weeks')
        .eq('coach_client_id', cc.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('checkins')
        .select('id, week_start, status, weight_kg, submitted_at')
        .eq('coach_client_id', cc.id)
        .order('week_start', { ascending: true }),
    ]);

  const weightSeries = (checkins ?? [])
    .filter((c) => c.weight_kg != null)
    .map((c) => ({ date: formatDate(c.week_start), peso: Number(c.weight_kg) }));

  const lastWeight = weightSeries.at(-1)?.peso;
  const allCheckins = checkins ?? [];
  const status: StatusKey = STATUS_META[cc.status as StatusKey] ? (cc.status as StatusKey) : 'ended';

  const dossier: Dossier = {
    id: cc.id,
    demo: false,
    name: client ? fullName(client) : (cc.invite_email ?? 'Cliente'),
    status,
    goal: intake?.primary_goal ?? null,
    startedAt: cc.started_at ?? null,
    startedLabel:
      status === 'invited'
        ? "In attesa che il cliente accetti l'invito e compili il questionario."
        : `Cliente dal ${formatDate(cc.started_at)}`,
    anagrafica: [
      {
        label: 'Sesso',
        value: client?.sex === 'male' ? 'Uomo' : client?.sex === 'female' ? 'Donna' : '—',
      },
      { label: 'Data di nascita', value: formatDate(client?.date_of_birth) },
      { label: 'Altezza', value: client?.height_cm ? `${client.height_cm} cm` : '—' },
      { label: 'Peso attuale', value: lastWeight ? formatKg(lastWeight) : '—' },
    ],
    anamnesi: intake
      ? [
          { label: 'Obiettivo', value: fieldValue(intake.primary_goal) },
          { label: 'Esperienza', value: fieldValue(intake.experience_level) },
          { label: 'Attività', value: fieldValue(intake.activity_level) },
          { label: 'Giorni/settimana', value: fieldValue(intake.weekly_availability) },
          { label: 'Infortuni', value: fieldValue(intake.injuries) === '—' ? 'Nessuno' : fieldValue(intake.injuries) },
          {
            label: 'Limitazioni',
            value: fieldValue(intake.limitations) === '—' ? 'Nessuna' : fieldValue(intake.limitations),
          },
        ]
      : null,
    weightSeries,
    programs: (programs ?? []).map((p) => ({
      id: p.id,
      label: p.name,
      meta: [p.goal, p.duration_weeks ? `${p.duration_weeks} settimane` : null]
        .filter(Boolean)
        .join(' · '),
      href: `/allenamenti/${p.id}`,
    })),
    activePrograms: (programs ?? []).filter((p) => p.status === 'active').length,
    plans: (plans ?? []).map((p) => ({
      id: p.id,
      label: p.name,
      meta: p.duration_weeks ? `${p.duration_weeks} settimane` : undefined,
      href: `/nutrizione/${p.id}`,
    })),
    checkins: allCheckins
      .slice(-5)
      .reverse()
      .map((ci) => ({
        id: ci.id,
        label: `Settimana del ${formatDate(ci.week_start)}`,
        meta: formatKg(ci.weight_kg),
        status: ci.status,
        href: `/checkin/${ci.id}`,
      })),
    totalCheckins: allCheckins.length,
    pendingCheckins: allCheckins.filter((ci) => ci.status === 'submitted').length,
    actions: {
      program: `/allenamenti?cliente=${cc.id}`,
      nutrition: `/nutrizione?cliente=${cc.id}`,
      assessment: `/clienti/${cc.id}/valutazione`,
      biofeedback: `/clienti/${cc.id}/biofeedback`,
    },
  };

  return <ClientDossier dossier={dossier} aiCoachClientId={cc.id} />;
}

function fieldValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

/** Iniziali dell'atleta: dal nome, o dalla parte locale dell'email. */
function initialsOf(name: string): string {
  const base = name.includes('@') ? name.split('@')[0].replace(/[._+-]+/g, ' ') : name;
  const parts = base.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function weeksSince(startedAt: string | null): number | null {
  if (!startedAt) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(startedAt) ? `${startedAt}T12:00:00` : startedAt;
  const weeks = Math.floor((Date.now() - new Date(iso).getTime()) / (7 * 24 * 3600 * 1000));
  return isFinite(weeks) && weeks >= 0 ? weeks : null;
}

// ---------------------------------------------------------------------------
// La scheda
// ---------------------------------------------------------------------------

function ClientDossier({
  dossier,
  aiCoachClientId,
}: {
  dossier: Dossier;
  aiCoachClientId?: string;
}) {
  const {
    demo,
    name,
    status,
    goal,
    startedAt,
    startedLabel,
    anagrafica,
    anamnesi,
    weightSeries,
    programs,
    activePrograms,
    plans,
    checkins,
    totalCheckins,
    pendingCheckins,
    actions,
  } = dossier;

  const statusMeta = STATUS_META[status];
  const StatusIcon = statusMeta.icon;

  const first = weightSeries[0]?.peso;
  const last = weightSeries.at(-1)?.peso;
  const hasChart = weightSeries.length >= 2;
  const diff = hasChart && first != null && last != null ? last - first : null;
  const diffLabel =
    diff == null
      ? '—'
      : `${diff > 0 ? '+' : diff < 0 ? '-' : ''}${Math.abs(diff).toLocaleString('it-IT', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })} kg`;

  const weeks = weeksSince(startedAt);

  const kpis: {
    label: string;
    value: string;
    delta?: string;
    deltaGood?: boolean;
    tone: 'neutral' | 'mint' | 'amber' | 'cyan';
  }[] = [
    { label: 'Peso attuale', value: last != null ? formatKg(last) : '—', tone: 'cyan' },
    { label: 'Variazione peso', value: diffLabel, tone: 'cyan' },
    {
      label: 'Check da rivedere',
      value: String(pendingCheckins),
      delta: pendingCheckins === 0 ? 'Nessun arretrato' : 'Aspettano la tua risposta',
      deltaGood: pendingCheckins === 0,
      tone: 'amber',
    },
    {
      label: 'Programmi attivi',
      value: String(activePrograms),
      delta:
        weeks == null
          ? undefined
          : weeks === 1
            ? '1 settimana insieme'
            : `${weeks} settimane insieme`,
      deltaGood: true,
      tone: 'mint',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ---------- Ritorno al roster ---------- */}
      <Link
        href={demo ? '/clienti?demo=1' : '/clienti'}
        className="press -ml-1 inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-1 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary transition hover:text-white"
      >
        <ArrowLeft size={15} aria-hidden />
        Tutti i clienti
      </Link>

      {/* ---------- Identità e azioni rapide ---------- */}
      <Card className="rise">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span
              className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-raised text-[22px] font-bold text-white"
              aria-hidden
            >
              {initialsOf(name)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="truncate text-[34px] font-extrabold leading-[1.1] tracking-[-0.02em] text-white">
                  {name}
                </h1>
                <Badge color={statusMeta.color}>
                  <StatusIcon size={12} className="mr-1.5" aria-hidden />
                  {statusMeta.label}
                </Badge>
                {demo && <Badge color="accent">Demo</Badge>}
              </div>
              <p className="mt-1.5 text-[15px] text-text-secondary">
                {[goal, startedLabel].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Link href={actions.program} className={cn(buttonSecondary, 'min-h-[44px]')}>
              <Dumbbell size={17} aria-hidden />
              Programma
            </Link>
            <Link href={actions.nutrition} className={cn(buttonSecondary, 'min-h-[44px]')}>
              <Utensils size={17} aria-hidden />
              Piano alimentare
            </Link>
            <Link href={actions.assessment} className={cn(buttonSecondary, 'min-h-[44px]')}>
              <Ruler size={17} aria-hidden />
              Valutazione
            </Link>
            <Link href={actions.biofeedback} className={cn(buttonSecondary, 'min-h-[44px]')}>
              <Activity size={17} aria-hidden />
              Biofeedback
            </Link>
          </div>
        </div>
      </Card>

      {/* ---------- I numeri del cliente ---------- */}
      <section aria-label="Indicatori del cliente" className="grid grid-cols-2 gap-4 md:grid-cols-4">
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

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        {/* ---------- IL FARO: come si sta muovendo il corpo ---------- */}
        <Card beacon={hasChart} className="rise rise-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[17px] font-bold text-white">Andamento del peso corporeo</h2>
              <p className="mt-1 text-[13px] text-text-secondary">
                Ogni punto è un check-in settimanale inviato dall&apos;atleta.
              </p>
            </div>
            <TrendingUp size={20} className="shrink-0 text-cyan" aria-hidden />
          </div>

          {hasChart ? (
            <>
              <div className="mt-4">
                <WeightChart data={weightSeries} />
              </div>
              <p className="mt-3 text-[13px] tnum text-text-secondary">
                Dal {weightSeries[0].date} al {weightSeries[weightSeries.length - 1].date} ·{' '}
                <span className="font-bold text-white">{diffLabel}</span> complessivi
              </p>
            </>
          ) : (
            <div className="mt-5 rounded-sm bg-raised px-5 py-10 text-center">
              <p className="text-[15px] leading-relaxed text-text-secondary">
                Servono almeno due check-in con il peso per disegnare la curva. Appena arriva il
                secondo, la trovi qui.
              </p>
            </div>
          )}
        </Card>

        {/* ---------- Chi è: anagrafica e anamnesi ---------- */}
        <Card className="rise rise-3">
          <h2 className="text-[17px] font-bold text-white">Anagrafica</h2>
          <FieldList fields={anagrafica} />

          <h2 className="mt-6 text-[17px] font-bold text-white">Anamnesi</h2>
          {anamnesi ? (
            <FieldList fields={anamnesi} />
          ) : (
            <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
              Questionario iniziale non ancora compilato dall&apos;atleta.
            </p>
          )}
        </Card>
      </div>

      {/* ---------- Il coach AI legge i dati di questo cliente ---------- */}
      {aiCoachClientId && (
        <div className="rise rise-3">
          <AiCoachWidget coachClientId={aiCoachClientId} />
        </div>
      )}

      {/* ---------- Le sezioni del percorso ---------- */}
      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard
          icon={Dumbbell}
          title="Programmi di allenamento"
          description="Schede assegnate a questo atleta."
          count={programs.length}
          actionLabel="Assegna un programma"
          actionHref={actions.program}
          className="rise rise-4"
        >
          {programs.length === 0 ? (
            <EmptyLine text="Nessun programma assegnato: parti da qui per dargli una direzione." />
          ) : (
            <ul>
              {programs.map((p) => (
                <NavRow key={p.id} href={p.href} title={p.label} meta={p.meta} />
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          icon={Utensils}
          title="Piani alimentari"
          description="Macro e progressioni collegate al percorso."
          count={plans.length}
          actionLabel="Crea un piano"
          actionHref={actions.nutrition}
          className="rise rise-4"
        >
          {plans.length === 0 ? (
            <EmptyLine text="Nessun piano assegnato: senza nutrizione il programma lavora a metà." />
          ) : (
            <ul>
              {plans.map((p) => (
                <NavRow key={p.id} href={p.href} title={p.label} meta={p.meta} />
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          icon={ClipboardCheck}
          title="Check-in"
          description={totalCheckins > 5 ? 'Gli ultimi cinque ricevuti.' : 'Tutti i check-in ricevuti.'}
          count={totalCheckins}
          actionLabel="Vai a tutti i check-in"
          actionHref={demo ? '/checkin?demo=1' : '/checkin'}
          className="rise rise-5"
        >
          {checkins.length === 0 ? (
            <EmptyLine text="Nessun check-in ricevuto. Ricorda all'atleta di inviarlo a fine settimana." />
          ) : (
            <ul>
              {checkins.map((ci) => {
                const meta = CHECK_META[ci.status] ?? CHECK_META.pending;
                return (
                  <NavRow
                    key={ci.id}
                    href={ci.href}
                    title={ci.label}
                    meta={ci.meta}
                    trailing={<Badge color={meta.color}>{meta.label}</Badge>}
                  />
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          icon={Activity}
          title="Corpo e biofeedback"
          description="Misure, composizione e segnali di recupero."
          tone="cyan"
          className="rise rise-5"
        >
          <ul>
            <NavRow
              href={actions.assessment}
              title="Valutazione corporea"
              meta="Circonferenze, plicometria e storico delle misure"
            />
            <NavRow
              href={actions.biofeedback}
              title="Biofeedback"
              meta="Sonno, energia, stress e fame giorno per giorno"
            />
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

function FieldList({ fields }: { fields: Field[] }) {
  return (
    <dl className="mt-3 divide-y divide-line/40">
      {fields.map((f) => (
        <div key={f.label} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="shrink-0 text-[13px] text-text-secondary">{f.label}</dt>
          <dd className="text-right text-[15px] font-semibold tnum text-white">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-sm bg-raised px-4 py-5">
      <p className="text-[15px] leading-relaxed text-text-secondary">{text}</p>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  count,
  tone = 'neutral',
  actionLabel,
  actionHref,
  className,
  children,
}: {
  icon: typeof Dumbbell;
  title: string;
  description: string;
  count?: number;
  /** Ciano solo dove il dato è il corpo: il colore resta un significato, non un vezzo. */
  tone?: 'neutral' | 'cyan';
  actionLabel?: string;
  actionHref?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              'grid h-11 w-11 shrink-0 place-items-center rounded-xs',
              tone === 'cyan' ? 'bg-cyan/15 text-cyan' : 'bg-raised text-text-secondary',
            )}
          >
            <Icon size={19} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold text-white">{title}</h2>
            <p className="mt-0.5 text-[13px] text-text-secondary">{description}</p>
          </div>
        </div>
        {count != null && (
          <span className="shrink-0 rounded-full bg-raised px-3 py-1.5 text-[13px] font-bold tnum text-white">
            {count}
          </span>
        )}
      </div>

      <div className="mt-2 flex-1">{children}</div>

      {actionHref && actionLabel && (
        <Link href={actionHref} className={cn(buttonGhost, 'mt-3 min-h-[44px] self-start px-0')}>
          {actionLabel}
          <ArrowUpRight size={15} aria-hidden />
        </Link>
      )}
    </Card>
  );
}

function NavRow({
  href,
  title,
  meta,
  trailing,
}: {
  href: string;
  title: string;
  meta?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <li className="border-b border-line/40 last:border-b-0">
      <Link
        href={href}
        className="press group -mx-2 flex min-h-[56px] items-center gap-3 rounded-xs px-2 py-3 transition hover:bg-raised"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold text-white">{title}</span>
          {meta && <span className="mt-0.5 block truncate text-[13px] tnum text-text-secondary">{meta}</span>}
        </span>
        {trailing}
        <ChevronRight
          size={18}
          className="shrink-0 text-text-tertiary transition group-hover:text-white"
          aria-hidden
        />
      </Link>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Modalità demo: stessa scheda, dati d'esempio
// ---------------------------------------------------------------------------

const DEMO_CLIENTS: Record<
  string,
  { name: string; goal: string; sex: string; height: number; weight: number; startedAt: string }
> = {
  'demo-marco': { name: 'Marco Bellini', goal: 'Ipertrofia lean bulk', sex: 'Uomo', height: 178, weight: 76.1, startedAt: '2026-05-04' },
  'demo-giulia': { name: 'Giulia Rinaldi', goal: 'Ricomp + glute focus', sex: 'Donna', height: 166, weight: 61.8, startedAt: '2026-04-15' },
  'demo-andrea': { name: 'Andrea Costa', goal: 'Forza su squat', sex: 'Uomo', height: 181, weight: 82.4, startedAt: '2026-03-20' },
  'demo-sofia': { name: 'Sofia Marino', goal: 'Dimagrimento sostenibile', sex: 'Donna', height: 170, weight: 68.2, startedAt: '2026-06-01' },
};

function buildDemoDossier(id: string): Dossier {
  const client = DEMO_CLIENTS[id] ?? DEMO_CLIENTS['demo-marco'];

  const weightSeries = [
    { date: '01/07', peso: client.weight + 1.2 },
    { date: '08/07', peso: client.weight + 0.8 },
    { date: '15/07', peso: client.weight + 0.3 },
    { date: '22/07', peso: client.weight },
  ];

  return {
    id,
    demo: true,
    name: client.name,
    status: 'active',
    goal: client.goal,
    startedAt: client.startedAt,
    startedLabel: `Cliente dal ${formatDate(client.startedAt)}`,
    anagrafica: [
      { label: 'Sesso', value: client.sex },
      { label: 'Età', value: '32 anni' },
      { label: 'Altezza', value: `${client.height} cm` },
      { label: 'Peso attuale', value: formatKg(client.weight) },
    ],
    anamnesi: [
      { label: 'Obiettivo', value: client.goal },
      { label: 'Esperienza', value: 'Intermedio' },
      { label: 'Giorni/settimana', value: '4' },
      { label: 'Limitazioni', value: 'Nessuna rilevante' },
    ],
    weightSeries,
    programs: [
      { id: 'demo-hypertrophy', label: 'Hypertrophy Engine W5', meta: 'Ipertrofia · 12 settimane', href: '/allenamenti/demo-hypertrophy?demo=1' },
      { id: 'demo-strength', label: 'Strength Reset', meta: 'Forza · 8 settimane', href: '/allenamenti/demo-strength?demo=1' },
    ],
    activePrograms: 1,
    plans: [
      { id: 'demo-lean-bulk', label: 'Lean Bulk 2740 kcal', meta: '12 settimane', href: '/nutrizione/demo-lean-bulk?demo=1' },
      { id: 'demo-recomp', label: 'Ricomp 2100 kcal ON/OFF', meta: '8 settimane', href: '/nutrizione/demo-recomp?demo=1' },
    ],
    checkins: [
      { id: 'demo-check-2', label: 'Settimana del 22/07/2026', meta: formatKg(client.weight), status: 'reviewed', href: '/checkin/demo-check-2?demo=1' },
      { id: 'demo-check-1', label: 'Settimana del 15/07/2026', meta: formatKg(client.weight + 0.3), status: 'submitted', href: '/checkin/demo-check-1?demo=1' },
      { id: 'demo-check-0', label: 'Settimana del 08/07/2026', meta: formatKg(client.weight + 0.8), status: 'reviewed', href: '/checkin/demo-check-0?demo=1' },
    ],
    totalCheckins: 3,
    pendingCheckins: 1,
    actions: {
      program: '/allenamenti/demo-hypertrophy?demo=1',
      nutrition: '/nutrizione/demo-lean-bulk?demo=1',
      assessment: `/clienti/${id}/valutazione?demo=1`,
      biofeedback: `/clienti/${id}/biofeedback?demo=1`,
    },
  };
}
