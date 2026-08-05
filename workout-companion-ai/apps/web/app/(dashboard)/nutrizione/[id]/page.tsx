import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Flame, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Badge, Card, KpiCard, PageHeader, buttonSecondary } from '@/components/ui';
import { cn } from '@/lib/utils';
import { MacroEditor } from './macro-editor';

export default async function NutritionPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ demo?: string }>;
}) {
  const { id } = await params;
  const { demo } = await searchParams;

  if (demo === '1') {
    return <DemoNutritionDetail id={id} />;
  }

  const supabase = await createClient();

  const { data: plan } = await supabase
    .from('nutrition_plans')
    .select(
      `id, name, status, duration_weeks, bmr_kcal, tdee_kcal, tdee_formula, pal, target_kcal, notes,
       coach_client:coach_clients(id,
         client:profiles!coach_clients_client_id_fkey(first_name, last_name, sex, date_of_birth, height_cm)),
       nutrition_days (id, week_number, day_of_week, day_type, kcal, protein_g, carbs_g, fat_g)`
    )
    .eq('id', id)
    .single();

  if (!plan) notFound();

  // Ultimo peso noto dal check-in e ultima valutazione corporea (per Katch-McArdle)
  const ccId = (plan.coach_client as any)?.id;
  let lastWeight: number | null = null;
  let lastAssessment: { lean_mass_kg: number | null; body_fat_pct: number | null; weight_kg: number | null } | null =
    null;
  if (ccId) {
    const [{ data: lastCheckin }, { data: assessment }] = await Promise.all([
      supabase
        .from('checkins')
        .select('weight_kg')
        .eq('coach_client_id', ccId)
        .not('weight_kg', 'is', null)
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('body_assessments')
        .select('lean_mass_kg, body_fat_pct, weight_kg')
        .eq('coach_client_id', ccId)
        .not('lean_mass_kg', 'is', null)
        .order('measured_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    lastWeight = lastCheckin?.weight_kg ?? assessment?.weight_kg ?? null;
    lastAssessment = assessment ?? null;
  }

  return (
    <MacroEditor initialPlan={plan as any} lastWeightKg={lastWeight} lastAssessment={lastAssessment} />
  );
}

/** Ritardi scalati per l'ingresso della fascia KPI (il ritardo va sulla Card interna). */
const KPI_DELAY = [
  '[&>div]:[animation-delay:0ms]',
  '[&>div]:[animation-delay:50ms]',
  '[&>div]:[animation-delay:100ms]',
  '[&>div]:[animation-delay:150ms]',
];

const DEMO_NUTRITION: Record<string, { name: string; client: string; kcal: number; protein: number; carbs: number; fat: number }> = {
  'demo-lean-bulk': { name: 'Lean Bulk 2740 kcal', client: 'Marco Bellini', kcal: 2740, protein: 180, carbs: 330, fat: 80 },
  'demo-recomp': { name: 'Ricomp 2100 kcal ON/OFF', client: 'Giulia Rinaldi', kcal: 2100, protein: 145, carbs: 220, fat: 70 },
  'demo-cut': { name: 'Cut sostenibile 1900 kcal', client: 'Andrea Costa', kcal: 1900, protein: 170, carbs: 165, fat: 65 },
};

function DemoNutritionDetail({ id }: { id: string }) {
  const plan = DEMO_NUTRITION[id] ?? DEMO_NUTRITION['demo-lean-bulk'];
  const meals: [string, string, string, number][] = [
    ['Colazione', '08:00', 'Yogurt greco, avena, frutti rossi', 520],
    ['Pranzo', '13:00', 'Riso basmati, pollo, verdure, olio EVO', 760],
    ['Pre workout', '17:00', 'Banana, whey, gallette', 310],
    ['Cena', '20:30', 'Salmone, patate, insalata', 850],
  ];
  // Quota kcal reale di ogni macro (4/4/9 kcal per grammo)
  const macroKcal = plan.protein * 4 + plan.carbs * 4 + plan.fat * 9;
  const mealsKcal = meals.reduce((a, m) => a + m[3], 0);
  const rest = plan.kcal - mealsKcal;

  const macros = [
    { label: 'Proteine', value: plan.protein, kcal: plan.protein * 4, tone: 'accent' as const },
    { label: 'Carboidrati', value: plan.carbs, kcal: plan.carbs * 4, tone: 'amber' as const },
    { label: 'Grassi', value: plan.fat, kcal: plan.fat * 9, tone: 'cyan' as const },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={plan.name}
        subtitle={`${plan.client} · rotazione giorni ON/OFF e macro target`}
        actions={
          <>
            <Badge color="accent">Demo</Badge>
            <Link href="/nutrizione?demo=1" className={cn(buttonSecondary, 'min-h-[44px]')}>
              <ArrowLeft size={16} aria-hidden />
              Tutti i piani
            </Link>
          </>
        }
      />

      {/* ---------- I numeri della giornata ---------- */}
      <section aria-label="Target giornaliero" className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className={KPI_DELAY[0]}>
          <KpiCard label="Obiettivo giornaliero" value={`${plan.kcal.toLocaleString('it-IT')} kcal`} />
        </div>
        {macros.map((m, i) => (
          <div key={m.label} className={KPI_DELAY[i + 1]}>
            <KpiCard
              label={m.label}
              value={`${m.value} g`}
              delta={`${Math.round((m.kcal / macroKcal) * 100)}% delle kcal`}
              tone={m.tone}
            />
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ---------- IL FARO: la giornata alimentare ---------- */}
        <Card beacon className="rise rise-2 overflow-hidden p-0 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3 px-6 pb-4 pt-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <Flame size={19} className="shrink-0 text-text-secondary" aria-hidden />
                <h2 className="text-[17px] font-bold text-white">La giornata tipo</h2>
              </div>
              <p className="mt-1 text-[13px] text-text-secondary">
                Quattro momenti, distribuiti attorno all’allenamento del pomeriggio.
              </p>
            </div>
            <span className="tnum shrink-0 rounded-full bg-raised px-3 py-1.5 text-[13px] font-bold text-white">
              {mealsKcal.toLocaleString('it-IT')} kcal nei pasti
            </span>
          </div>

          {/* Tabella densa da 768px in su */}
          <table className="hidden w-full border-t border-line/60 text-left md:table">
            <thead>
              <tr className="border-b border-line/60">
                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                  Pasto
                </th>
                <th className="px-4 py-3.5 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                  Alimenti
                </th>
                <th className="px-6 py-3.5 text-right text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                  Kcal
                </th>
              </tr>
            </thead>
            <tbody>
              {meals.map(([name, time, foods, kcal]) => (
                <tr key={name} className="border-b border-line/40 transition last:border-b-0 hover:bg-raised">
                  <td className="px-6 py-4">
                    <div className="text-[17px] font-bold text-white">{name}</div>
                    <div className="tnum mt-0.5 flex items-center gap-1.5 text-[13px] text-text-secondary">
                      <Clock size={12} className="shrink-0" aria-hidden />
                      {time}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[15px] leading-relaxed text-text-secondary">{foods}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-metric tnum text-[22px] font-extrabold text-white">
                      {kcal.toLocaleString('it-IT')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Sotto 768px ogni pasto diventa una card */}
          <ul className="border-t border-line/60 md:hidden">
            {meals.map(([name, time, foods, kcal]) => (
              <li key={name} className="border-b border-line/40 px-5 py-4 last:border-b-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[17px] font-bold text-white">{name}</span>
                  <span className="font-metric tnum text-[22px] font-extrabold text-white">
                    {kcal.toLocaleString('it-IT')}
                  </span>
                </div>
                <div className="tnum mt-1 flex items-center gap-1.5 text-[13px] text-text-secondary">
                  <Clock size={12} className="shrink-0" aria-hidden />
                  {time}
                </div>
                <p className="mt-1.5 text-[15px] leading-relaxed text-text-secondary">{foods}</p>
              </li>
            ))}
          </ul>

          <p className="tnum border-t border-line/60 px-6 py-4 text-[13px] text-text-secondary">
            {rest === 0 ? (
              <>I pasti coprono esattamente l’obiettivo giornaliero.</>
            ) : rest > 0 ? (
              <>
                Restano{' '}
                <strong className="font-bold text-amber">{rest.toLocaleString('it-IT')} kcal</strong> da
                assegnare (spuntini o post workout).
              </>
            ) : (
              <>
                Sei{' '}
                <strong className="font-bold text-amber">
                  {Math.abs(rest).toLocaleString('it-IT')} kcal
                </strong>{' '}
                sopra l’obiettivo: alleggerisci un pasto.
              </>
            )}
          </p>
        </Card>

        {/* ---------- Ripartizione dei macro ---------- */}
        <Card className="rise rise-3">
          <h2 className="text-[17px] font-bold text-white">Ripartizione macro</h2>
          <p className="mt-1 text-[13px] text-text-secondary">
            Quota di calorie coperta da ciascun macronutriente.
          </p>
          <div className="mt-5 space-y-4">
            {macros.map((m) => (
              <MacroBar
                key={m.label}
                label={m.label}
                grams={m.value}
                kcalShare={m.kcal / macroKcal}
                tone={m.tone}
              />
            ))}
          </div>
          <dl className="mt-5 space-y-2.5 border-t border-line/60 pt-4 text-[15px]">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-text-secondary">Kcal dai macro</dt>
              <dd className="tnum font-semibold text-white">{macroKcal.toLocaleString('it-IT')}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-text-secondary">C : G ratio</dt>
              <dd className="tnum font-semibold text-white">
                {Math.round((plan.carbs / plan.fat) * 10) / 10} : 1
              </dd>
            </div>
          </dl>
        </Card>

        {/* ---------- Regole di adattamento ---------- */}
        <Card className="rise rise-4 lg:col-span-3">
          <div className="flex items-center gap-2.5">
            <Sparkles size={18} className="shrink-0 text-violet" aria-hidden />
            <h2 className="text-[17px] font-bold text-white">Regole di adattamento</h2>
          </div>
          <ul className="mt-3.5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <li className="rounded-md bg-raised px-4 py-3.5 text-[15px] leading-relaxed text-text-secondary">
              Se il peso medio scende oltre lo{' '}
              <strong className="tnum font-bold text-white">0,8% a settimana</strong>, aggiungi{' '}
              <strong className="tnum font-bold text-amber">25 g</strong> di carboidrati nei giorni ON.
            </li>
            <li className="rounded-md bg-raised px-4 py-3.5 text-[15px] leading-relaxed text-text-secondary">
              Se l’aderenza scende sotto l’
              <strong className="tnum font-bold text-white">80%</strong>, semplifica il piano tenendo le{' '}
              <strong className="font-bold text-accent">proteine</strong> costanti.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

/** Barra di ripartizione: il colore dice quale macro è, l'etichetta lo ripete. */
function MacroBar({
  label,
  grams,
  kcalShare,
  tone,
}: {
  label: string;
  grams: number;
  /** Quota 0-1 delle kcal giornaliere coperta dal macro. */
  kcalShare: number;
  tone: 'accent' | 'amber' | 'cyan';
}) {
  const pct = Math.round(Math.min(Math.max(kcalShare, 0), 1) * 100);
  const dot = { accent: 'bg-accent', amber: 'bg-amber', cyan: 'bg-cyan' }[tone];
  const text = { accent: 'text-accent', amber: 'text-amber', cyan: 'text-cyan' }[tone];

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-2 text-[15px] font-semibold text-white">
          <span className={cn('h-2 w-2 shrink-0 rounded-full', dot)} aria-hidden />
          {label}
        </span>
        <span className="tnum text-[15px] font-bold text-white">
          {grams} g <span className={cn('font-semibold', text)}>· {pct}%</span>
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-raised">
        <div className={cn('h-full rounded-full', dot)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
