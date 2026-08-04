import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Badge, Card, PageHeader } from '@/components/ui';
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

  return (
    <div>
      <PageHeader
        title={plan.name}
        subtitle={`${plan.client} - rotazione giorni ON/OFF e macro target`}
        actions={<Badge color="accent">Demo</Badge>}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rise rise-1">
          <h3 className="font-semibold mb-4">Target giornaliero</h3>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-white tabular-nums">
              {plan.kcal.toLocaleString('it-IT')}
            </span>
            <span className="text-sm text-text-secondary">kcal</span>
          </div>
          <div className="mt-5 space-y-3">
            <Macro label="Proteine" value={plan.protein} kcalShare={(plan.protein * 4) / macroKcal} color="bg-accent" />
            <Macro label="Carboidrati" value={plan.carbs} kcalShare={(plan.carbs * 4) / macroKcal} color="bg-avio" />
            <Macro label="Grassi" value={plan.fat} kcalShare={(plan.fat * 9) / macroKcal} color="bg-celeste" />
          </div>
        </Card>
        <Card className="lg:col-span-2 rise rise-2">
          <h3 className="font-semibold mb-4">Pasti di oggi</h3>
          <div className="space-y-3">
            {meals.map(([name, time, foods, kcal]) => (
              <div
                key={name}
                className="rounded-xl border border-border bg-background/60 p-4 transition-colors hover:border-celeste/25"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h4 className="font-bold text-white">{name}</h4>
                      <span className="rounded-md border border-border px-1.5 py-0.5 text-xs text-text-secondary tabular-nums">
                        {time}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-text-secondary">{foods}</p>
                  </div>
                  <span className="font-black text-accent tabular-nums shrink-0">{kcal} kcal</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-3 rise rise-3">
          <h3 className="font-semibold mb-3">Regole adattamento</h3>
          <p className="text-sm text-text-secondary">
            Se peso medio scende oltre 0,8% a settimana, aumenta carboidrati di 25g nei giorni ON.
            Se aderenza sotto 80%, semplifica il piano mantenendo proteine costanti.
          </p>
          <Link
            href="/nutrizione?demo=1"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
          >
            <ArrowLeft size={14} />
            Torna ai piani alimentari
          </Link>
        </Card>
      </div>
    </div>
  );
}

function Macro({
  label,
  value,
  kcalShare,
  color,
}: {
  label: string;
  value: number;
  /** Quota 0-1 delle kcal giornaliere coperta dal macro. */
  kcalShare: number;
  color: string;
}) {
  const pct = Math.round(Math.min(Math.max(kcalShare, 0), 1) * 100);
  return (
    <div>
      <div className="flex justify-between items-center text-sm">
        <span className="flex items-center gap-1.5 text-text-secondary">
          <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
          {label}
        </span>
        <span className="font-bold tabular-nums">
          {value}g <span className="font-normal text-text-secondary">· {pct}%</span>
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
