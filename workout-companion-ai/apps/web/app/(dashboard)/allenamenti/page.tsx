import Link from 'next/link';
import {
  Archive,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileText,
  Target,
  User,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState, KpiCard, buttonSecondary } from '@/components/ui';
import { PROGRAM_GOALS } from '@wc/shared';
import { cn, fullName } from '@/lib/utils';
import { NewProgramForm } from './new-program-form';

/** Ogni stato porta colore + icona + parola: il colore non è mai l'unica informazione. */
const STATUS_META: Record<
  string,
  {
    label: string;
    color: 'success' | 'warning' | 'default';
    icon: typeof CheckCircle2;
    tone: string;
  }
> = {
  active: { label: 'Attivo', color: 'success', icon: CheckCircle2, tone: 'text-mint' },
  draft: { label: 'Bozza', color: 'warning', icon: FileText, tone: 'text-amber' },
  archived: { label: 'Archiviato', color: 'default', icon: Archive, tone: 'text-text-secondary' },
};

const FALLBACK_META = {
  label: 'Sconosciuto',
  color: 'default' as const,
  icon: FileText,
  tone: 'text-text-secondary',
};

/** Ritardi scalati per l'ingresso della fascia KPI (il ritardo va sulla Card interna). */
const KPI_DELAY = [
  '[&>div]:[animation-delay:0ms]',
  '[&>div]:[animation-delay:50ms]',
  '[&>div]:[animation-delay:100ms]',
  '[&>div]:[animation-delay:150ms]',
];

const DEMO_PROGRAMS = [
  { id: 'demo-hypertrophy', name: 'Hypertrophy Engine W5', goal: 'hypertrophy', status: 'active', duration_weeks: 8, coach_client: { client: { first_name: 'Marco', last_name: 'Bellini' } } },
  { id: 'demo-glute', name: 'Glute Focus 12W', goal: 'recomp', status: 'active', duration_weeks: 12, coach_client: { client: { first_name: 'Giulia', last_name: 'Rinaldi' } } },
  { id: 'demo-strength', name: 'Strength Reset', goal: 'strength', status: 'draft', duration_weeks: 6, coach_client: { client: { first_name: 'Andrea', last_name: 'Costa' } } },
];

export default async function ProgramsPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  if (demo === '1') {
    return <ProgramsGrid programs={DEMO_PROGRAMS} clientOptions={[]} demo />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: programs }, { data: clients }] = await Promise.all([
    supabase
      .from('programs')
      .select(
        'id, name, goal, status, duration_weeks, coach_client:coach_clients(id, client:profiles!coach_clients_client_id_fkey(first_name, last_name))'
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

  return <ProgramsGrid programs={programs ?? []} clientOptions={clientOptions} />;
}

function ProgramsGrid({ programs, clientOptions, demo = false }: { programs: any[]; clientOptions: { id: string; label: string }[]; demo?: boolean }) {
  const active = programs.filter((p) => p.status === 'active').length;
  const drafts = programs.filter((p) => p.status === 'draft').length;
  const archived = programs.filter((p) => p.status === 'archived').length;
  const assigned = programs.filter((p) => (p.coach_client as any)?.client).length;
  const weeks = programs.reduce((sum, p) => sum + (Number(p.duration_weeks) || 0), 0);

  const kpis: {
    label: string;
    value: string;
    delta?: string;
    deltaGood?: boolean;
    tone: 'neutral' | 'mint' | 'amber' | 'accent';
  }[] = [
    {
      label: 'In consegna',
      value: String(active),
      delta: active === 0 ? 'Nessuna scheda attiva' : `${assigned} assegnate a un atleta`,
      deltaGood: active > 0,
      tone: 'mint',
    },
    {
      label: 'Bozze aperte',
      value: String(drafts),
      delta: drafts === 0 ? 'Tutto consegnato' : 'Da completare e attivare',
      deltaGood: drafts === 0,
      tone: 'amber',
    },
    { label: 'Schede totali', value: String(programs.length), tone: 'neutral' },
    { label: 'Settimane pianificate', value: String(weeks), tone: 'accent' },
  ];

  /* La scheda più recente è il faro della pagina: si riprende da lì. */
  const hero = programs[0];
  const rest = programs.slice(1);

  const counters: { key: string; label: string; value: number }[] = [
    { key: 'active', label: 'Attivi', value: active },
    { key: 'draft', label: 'Bozze', value: drafts },
    { key: 'archived', label: 'Archiviati', value: archived },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Allenamenti"
        subtitle={
          demo
            ? 'Stessa sezione programmi, compilata con esempi avanzati: perfetta da mostrare in call.'
            : 'Le tue schede multi-settimana: periodizzazione, volume per gruppo muscolare e consegna al cliente.'
        }
        actions={
          demo ? (
            <>
              <Badge color="accent">Demo</Badge>
              <Link href="/allenamenti" className={cn(buttonSecondary, 'min-h-[44px]')}>
                Torna ai dati reali
              </Link>
            </>
          ) : (
            <>
              <Link href="/allenamenti?demo=1" className={cn(buttonSecondary, 'min-h-[44px]')}>
                Vedi con dati demo
                <ArrowUpRight size={16} aria-hidden />
              </Link>
              <NewProgramForm clients={clientOptions} />
            </>
          )
        }
      />

      {programs.length === 0 ? (
        <EmptyState
          emoji="🏋️"
          title="Nessuna scheda in archivio"
          description="Crea il primo programma: aggiungi settimane, sessioni ed esercizi dalla libreria con serie, ripetizioni, RPE e recuperi. Il builder calcola il volume per gruppo muscolare mentre scrivi."
          action={
            <Link href="/allenamenti?demo=1" className={cn(buttonSecondary, 'min-h-[44px]')}>
              Guarda com’è con dati demo
              <ArrowUpRight size={16} aria-hidden />
            </Link>
          }
        />
      ) : (
        <>
          {/* ---------- Il polso dell'archivio ---------- */}
          <section aria-label="Stato dei programmi" className="grid grid-cols-2 gap-4 md:grid-cols-4">
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

          {/* ---------- IL FARO: la scheda su cui hai lavorato per ultima ---------- */}
          <section aria-label="Scheda più recente">
            <HeroProgramCard program={hero} demo={demo} />
          </section>

          {/* ---------- L'archivio ---------- */}
          {rest.length > 0 && (
            <section aria-label="Elenco dei programmi" className="space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <h2 className="text-[19px] font-bold tracking-[-0.01em] text-white">
                  Le altre schede
                </h2>
                <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {counters.map((c) => (
                    <li key={c.key} className="flex items-baseline gap-1.5">
                      <span
                        className={cn(
                          'tnum text-[15px] font-bold',
                          (STATUS_META[c.key] ?? FALLBACK_META).tone
                        )}
                      >
                        {c.value}
                      </span>
                      <span className="text-[13px] text-text-secondary">{c.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {rest.map((p, i) => (
                  <ProgramCard key={p.id} program={p} demo={demo} index={i} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** La scheda più recente, in scala doppia: è da qui che il coach riparte. */
function HeroProgramCard({ program, demo }: { program: any; demo: boolean }) {
  const meta = STATUS_META[program.status] ?? { ...FALLBACK_META, label: String(program.status) };
  const Icon = meta.icon;
  const client = (program.coach_client as any)?.client;

  return (
    <Link
      href={demo ? `/allenamenti/${program.id}?demo=1` : `/allenamenti/${program.id}`}
      className="group block rise rise-1"
      aria-label={`Riprendi il builder di ${program.name}`}
    >
      <Card beacon className="p-0 transition group-hover:bg-card-hover">
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:p-7">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.06em] text-accent">
                Ultima modificata
              </span>
              <Badge color={meta.color}>
                <Icon size={12} className="mr-1.5" aria-hidden />
                {meta.label}
              </Badge>
            </div>
            <h2 className="mt-3.5 text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] text-white sm:text-[32px]">
              {program.name}
            </h2>
            <p className="mt-2.5 max-w-lg text-[15px] leading-relaxed text-text-secondary">
              Riprendi da dove hai lasciato: settimane, sessioni, serie prescritte e volume per
              gruppo muscolare, tutto nello stesso editor.
            </p>
          </div>

          <div className="shrink-0 lg:w-[23rem]">
            <dl className="grid grid-cols-2 gap-2">
              <MetaTile icon={Target} label="Obiettivo">
                {PROGRAM_GOALS[program.goal as keyof typeof PROGRAM_GOALS] ?? program.goal}
              </MetaTile>
              <MetaTile icon={CalendarDays} label="Durata" numeric>
                {program.duration_weeks} settimane
              </MetaTile>
              <div className="col-span-2">
                <MetaTile icon={User} label="Atleta">
                  {client ? fullName(client) : 'Template — nessun cliente'}
                </MetaTile>
              </div>
            </dl>
            <span className="mt-3.5 inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-bold text-accent transition group-hover:text-accent-hover">
              Apri il builder
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
  icon: typeof Target;
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

/** Card d'archivio: densa, tutta l'informazione utile in un colpo d'occhio. */
function ProgramCard({ program, demo, index }: { program: any; demo: boolean; index: number }) {
  const meta = STATUS_META[program.status] ?? { ...FALLBACK_META, label: String(program.status) };
  const Icon = meta.icon;
  const client = (program.coach_client as any)?.client;

  return (
    <Link
      href={demo ? `/allenamenti/${program.id}?demo=1` : `/allenamenti/${program.id}`}
      className={cn('group block rise', index < 4 && `rise-${index + 2}`)}
      aria-label={`Apri il builder di ${program.name}`}
    >
      <Card className="flex h-full flex-col p-5 transition group-hover:bg-card-hover">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[19px] font-bold leading-snug tracking-[-0.01em] text-white">
            {program.name}
          </h3>
          <Badge color={meta.color}>
            <Icon size={12} className="mr-1.5" aria-hidden />
            {meta.label}
          </Badge>
        </div>

        <dl className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-text-secondary">
          <div className="flex items-center gap-1.5">
            <Target size={14} className="shrink-0" aria-hidden />
            <dt className="sr-only">Obiettivo</dt>
            <dd>{PROGRAM_GOALS[program.goal as keyof typeof PROGRAM_GOALS] ?? program.goal}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarDays size={14} className="shrink-0" aria-hidden />
            <dt className="sr-only">Durata</dt>
            <dd className="tnum">{program.duration_weeks} settimane</dd>
          </div>
        </dl>

        <div className="mt-3.5 flex items-center gap-2.5 rounded-md bg-raised px-3.5 py-3">
          <User size={16} className="shrink-0 text-text-secondary" aria-hidden />
          <span className="min-w-0 truncate text-[15px] font-semibold text-white">
            {client ? fullName(client) : 'Template — nessun cliente'}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-end pt-4">
          <span className="inline-flex items-center gap-1 text-[15px] font-semibold text-accent transition group-hover:text-accent-hover">
            Apri il builder
            <ChevronRight size={16} aria-hidden />
          </span>
        </div>
      </Card>
    </Link>
  );
}
