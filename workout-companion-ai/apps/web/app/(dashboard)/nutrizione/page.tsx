import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleDashed,
  CircleCheck,
  Flame,
  UserRound,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState, KpiCard, buttonSecondary } from '@/components/ui';
import { cn, fullName } from '@/lib/utils';
import { NewPlanForm } from './new-plan-form';

const DEMO_PLANS = [
  { id: 'demo-lean-bulk', name: 'Lean Bulk 2740 kcal', status: 'active', duration_weeks: 8, tdee_kcal: 2860, target_kcal: 2740, coach_client: { client: { first_name: 'Marco', last_name: 'Bellini' } } },
  { id: 'demo-recomp', name: 'Ricomp 2100 kcal ON/OFF', status: 'active', duration_weeks: 12, tdee_kcal: 2320, target_kcal: 2100, coach_client: { client: { first_name: 'Giulia', last_name: 'Rinaldi' } } },
  { id: 'demo-cut', name: 'Cut sostenibile 1900 kcal', status: 'draft', duration_weeks: 6, tdee_kcal: 2480, target_kcal: 1900, coach_client: { client: { first_name: 'Andrea', last_name: 'Costa' } } },
];

/** Ritardi scalati per l'ingresso della fascia KPI (il ritardo va sulla Card interna). */
const KPI_DELAY = [
  '[&>div]:[animation-delay:0ms]',
  '[&>div]:[animation-delay:50ms]',
  '[&>div]:[animation-delay:100ms]',
  '[&>div]:[animation-delay:150ms]',
];

const STATUS_META = {
  active: { label: 'Attivo', color: 'success' as const, icon: CircleCheck },
  draft: { label: 'Bozza', color: 'warning' as const, icon: CircleDashed },
};

export default async function NutritionPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  if (demo === '1') {
    return <NutritionGrid plans={DEMO_PLANS} clientOptions={[]} demo />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: plans }, { data: clients }] = await Promise.all([
    supabase
      .from('nutrition_plans')
      .select(
        'id, name, status, duration_weeks, tdee_kcal, target_kcal, coach_client:coach_clients(client:profiles!coach_clients_client_id_fkey(first_name, last_name))'
      )
      .eq('created_by', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('coach_clients')
      .select('id, client:profiles!coach_clients_client_id_fkey(first_name, last_name)')
      .eq('coach_id', user!.id)
      .in('status', ['active', 'invited']),
  ]);

  const clientOptions = (clients ?? []).map((c) => ({
    id: c.id,
    label: c.client ? fullName(c.client as any) : 'Cliente invitato',
  }));

  return <NutritionGrid plans={plans ?? []} clientOptions={clientOptions} />;
}

function NutritionGrid({ plans, clientOptions, demo = false }: { plans: any[]; clientOptions: { id: string; label: string }[]; demo?: boolean }) {
  const active = plans.filter((p) => p.status === 'active').length;
  const drafts = plans.filter((p) => p.status !== 'active').length;
  const weeks = plans.reduce((a, p) => a + (p.duration_weeks ?? 0), 0);

  /* Quanti atleti hanno almeno un piano: è il numero che dice se la sezione lavora. */
  const athletes = new Set(
    plans
      .map((p) => (p.coach_client as any)?.client)
      .filter(Boolean)
      .map((c: any) => fullName(c))
  ).size;

  const kcalValues = plans
    .map((p) => p.target_kcal ?? p.tdee_kcal)
    .filter((k): k is number => typeof k === 'number');
  const avgKcal =
    kcalValues.length > 0 ? Math.round(kcalValues.reduce((a, k) => a + k, 0) / kcalValues.length) : null;

  const kpis: {
    label: string;
    value: string;
    delta?: string;
    deltaGood?: boolean;
    tone: 'neutral' | 'accent' | 'mint' | 'amber';
  }[] = [
    {
      label: 'Piani in consegna',
      value: String(active),
      delta: active === 0 ? 'Nessun piano attivo' : `su ${athletes} ${athletes === 1 ? 'atleta' : 'atleti'}`,
      deltaGood: active > 0,
      tone: 'mint',
    },
    {
      label: 'Bozze aperte',
      value: String(drafts),
      delta: drafts === 0 ? 'Tutto consegnato' : 'Da chiudere e attivare',
      deltaGood: drafts === 0,
      tone: 'amber',
    },
    { label: 'Media kcal obiettivo', value: avgKcal != null ? avgKcal.toLocaleString('it-IT') : '—', tone: 'neutral' },
    { label: 'Settimane pianificate', value: String(weeks), tone: 'accent' },
  ];

  /* Il piano più recente è il faro: è da lì che il coach riprende. */
  const hero = plans[0];
  const rest = plans.slice(1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Piani Alimentari"
        subtitle={
          demo
            ? 'Stessa sezione nutrizione, compilata con piani e macro demo: pronta da mostrare in call.'
            : 'Calorie e macro giorno per giorno, rotazione ON/OFF, calcolo del fabbisogno e progressioni automatiche.'
        }
        actions={
          demo ? (
            <>
              <Badge color="accent">Demo</Badge>
              <Link href="/nutrizione" className={cn(buttonSecondary, 'min-h-[44px]')}>
                Torna ai dati reali
              </Link>
            </>
          ) : (
            <>
              <Link href="/nutrizione?demo=1" className={cn(buttonSecondary, 'min-h-[44px]')}>
                Vedi con dati demo
                <ArrowUpRight size={16} aria-hidden />
              </Link>
              <NewPlanForm clients={clientOptions} />
            </>
          )
        }
      />

      {plans.length === 0 ? (
        <EmptyState
          emoji="🍽️"
          title="Nessun piano alimentare"
          description="Crea il primo piano: imposti calorie e macro per ogni giorno della settimana, distingui i giorni di allenamento da quelli di riposo e lasci che la progressione generi le settimane successive."
          action={
            <Link href="/nutrizione?demo=1" className={cn(buttonSecondary, 'min-h-[44px]')}>
              Guarda com’è con dati demo
              <ArrowUpRight size={16} aria-hidden />
            </Link>
          }
        />
      ) : (
        <>
          {/* ---------- Il polso della sezione ---------- */}
          <section aria-label="Stato dei piani alimentari" className="grid grid-cols-2 gap-4 md:grid-cols-4">
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

          {/* ---------- IL FARO: il piano su cui hai lavorato per ultimo ---------- */}
          <section aria-label="Piano più recente">
            <HeroPlanCard plan={hero} demo={demo} />
          </section>

          {/* ---------- L'archivio dei piani ---------- */}
          {rest.length > 0 && (
            <section aria-label="Elenco dei piani alimentari" className="space-y-4">
              <h2 className="text-[19px] font-bold tracking-[-0.01em] text-white">Gli altri piani</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {rest.map((p, i) => (
                  <PlanCard key={p.id} plan={p} demo={demo} index={i} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** Il piano più recente, in scala doppia: il numero di kcal domina la pagina. */
function HeroPlanCard({ plan, demo }: { plan: any; demo: boolean }) {
  const meta = STATUS_META[plan.status as keyof typeof STATUS_META] ?? {
    label: String(plan.status),
    color: 'default' as const,
    icon: CircleDashed,
  };
  const Icon = meta.icon;
  const client = (plan.coach_client as any)?.client;
  const kcal = plan.target_kcal ?? plan.tdee_kcal;
  const isTarget = plan.target_kcal != null;

  return (
    <Link
      href={demo ? `/nutrizione/${plan.id}?demo=1` : `/nutrizione/${plan.id}`}
      className="group block rise rise-1"
      aria-label={`Apri il piano ${plan.name}`}
    >
      <Card beacon className="p-0 transition group-hover:bg-card-hover">
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:p-7">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.06em] text-accent">
                Ultimo modificato
              </span>
              <Badge color={meta.color}>
                <Icon size={12} className="mr-1.5" aria-hidden />
                {meta.label}
              </Badge>
            </div>
            <h2 className="mt-3.5 text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] text-white sm:text-[32px]">
              {plan.name}
            </h2>
            <p className="mt-2.5 max-w-lg text-[15px] leading-relaxed text-text-secondary">
              Apri l’editor per rivedere macro giorno per giorno, rotazione ON/OFF e la progressione
              delle settimane successive.
            </p>
          </div>

          <div className="shrink-0 lg:w-[23rem]">
            {kcal != null ? (
              <div className="rounded-md bg-raised px-4 py-3.5">
                <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                  <Flame size={13} className="shrink-0" aria-hidden />
                  {isTarget ? 'Obiettivo giornaliero' : 'Fabbisogno stimato'}
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="font-metric tnum text-[46px] font-extrabold leading-none text-white sm:text-[54px]">
                    {kcal.toLocaleString('it-IT')}
                  </span>
                  <span className="text-[15px] font-semibold text-text-secondary">kcal/die</span>
                </div>
              </div>
            ) : (
              <div className="rounded-md bg-raised px-4 py-3.5 text-[15px] text-text-secondary">
                Macro ancora da definire: apri il piano e imposta il fabbisogno.
              </div>
            )}

            <dl className="mt-2 grid grid-cols-2 gap-2">
              <MetaTile icon={UserRound} label="Atleta">
                {client ? fullName(client) : 'Nessun atleta collegato'}
              </MetaTile>
              <MetaTile icon={CalendarDays} label="Durata" numeric>
                {plan.duration_weeks} settimane
              </MetaTile>
            </dl>

            <span className="mt-3.5 inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-bold text-accent transition group-hover:text-accent-hover">
              Apri l’editor macro
              <ChevronRight size={17} aria-hidden />
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function MetaTile({
  icon: Icon,
  label,
  numeric = false,
  children,
}: {
  icon: typeof UserRound;
  label: string;
  numeric?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md bg-raised px-3.5 py-3">
      <dt className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
        <Icon size={13} className="shrink-0" aria-hidden />
        {label}
      </dt>
      <dd className={cn('mt-1.5 truncate text-[15px] font-semibold text-white', numeric && 'tnum')}>
        {children}
      </dd>
    </div>
  );
}

/** Card d'archivio: nome, stato, calorie e atleta in un colpo d'occhio. */
function PlanCard({ plan, demo, index }: { plan: any; demo: boolean; index: number }) {
  const meta = STATUS_META[plan.status as keyof typeof STATUS_META] ?? {
    label: String(plan.status),
    color: 'default' as const,
    icon: CircleDashed,
  };
  const Icon = meta.icon;
  const client = (plan.coach_client as any)?.client;
  const kcal = plan.target_kcal ?? plan.tdee_kcal;
  const isTarget = plan.target_kcal != null;

  return (
    <Link
      href={demo ? `/nutrizione/${plan.id}?demo=1` : `/nutrizione/${plan.id}`}
      className={cn('group block rise', index < 4 && `rise-${index + 2}`)}
      aria-label={`Apri il piano ${plan.name}`}
    >
      <Card className="flex h-full flex-col p-5 transition group-hover:bg-card-hover">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[19px] font-bold leading-snug tracking-[-0.01em] text-white">
            {plan.name}
          </h3>
          <Badge color={meta.color}>
            <Icon size={12} className="mr-1.5" aria-hidden />
            {meta.label}
          </Badge>
        </div>

        {kcal != null ? (
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="font-metric tnum text-[34px] font-extrabold leading-none text-white">
                {kcal.toLocaleString('it-IT')}
              </span>
              <span className="text-[13px] font-semibold text-text-secondary">kcal/die</span>
            </div>
            <p className="mt-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
              {isTarget ? 'Obiettivo giornaliero' : 'Fabbisogno stimato'}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-[15px] text-text-secondary">Macro ancora da definire</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line/60 pt-3.5 text-[13px]">
          <span className="flex min-w-0 items-center gap-1.5 text-text-secondary">
            <UserRound size={14} className="shrink-0" aria-hidden />
            <span className="truncate">{client ? fullName(client) : 'Nessun atleta'}</span>
          </span>
          <span className="tnum shrink-0 font-semibold text-text-secondary">
            {plan.duration_weeks} sett.
          </span>
        </div>
      </Card>
    </Link>
  );
}
