import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MacroEditor } from './macro-editor';

export default async function NutritionPlanPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: plan } = await supabase
    .from('nutrition_plans')
    .select(
      `id, name, status, duration_weeks, bmr_kcal, tdee_kcal, tdee_formula, pal, target_kcal, notes,
       coach_client:coach_clients(id,
         client:profiles!coach_clients_client_id_fkey(first_name, last_name, sex, date_of_birth, height_cm)),
       nutrition_days (id, week_number, day_of_week, day_type, kcal, protein_g, carbs_g, fat_g)`
    )
    .eq('id', params.id)
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
