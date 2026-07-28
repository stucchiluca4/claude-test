import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui';
import { fullName } from '@/lib/utils';
import { BiofeedbackDashboard, type BiofeedbackEntry } from './biofeedback-dashboard';

function toNum(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default async function BiofeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ demo?: string }>;
}) {
  const { id } = await params;
  const { demo } = await searchParams;

  if (demo === '1') {
    const client = id.includes('giulia') ? 'Giulia Rinaldi' : id.includes('andrea') ? 'Andrea Costa' : 'Marco Bellini';
    const entries: BiofeedbackEntry[] = Array.from({ length: 21 }, (_, i) => {
      const date = new Date('2026-07-08T00:00:00Z');
      date.setDate(date.getDate() + i);
      return {
        id: `demo-bio-${i}`,
        log_date: date.toISOString().slice(0, 10),
        sleep_quality: 6 + (i % 4),
        sleep_hours: 6.5 + (i % 3) * 0.5,
        stress_level: 6 - (i % 3),
        energy_level: 6 + (i % 4),
        muscle_soreness: 5 + (i % 4),
        joint_stress: 2 + (i % 3),
        recovery: 6 + (i % 4),
        carbs_g: 230 + i * 2,
        protein_g: 175,
        fat_g: 70,
        kcal_consumed: 2380 + i * 8,
        hydration_l: 2.4 + (i % 4) * 0.2,
        steps: 8200 + i * 110,
        weight_kg: 76.9 - i * 0.04,
        notes: i === 18 ? 'Gambe affaticate, sonno medio.' : null,
      };
    });

    return (
      <div>
        <PageHeader
          title={`Monitoraggio & Biofeedback - ${client}`}
          subtitle="Sonno, stress, energia, alimentazione e attivita registrati quotidianamente - demo."
        />
        <BiofeedbackDashboard entries={entries} kcalTarget={2440} />
      </div>
    );
  }

  const supabase = await createClient();

  const { data: cc } = await supabase
    .from('coach_clients')
    .select(
      'id, invite_email, client:profiles!coach_clients_client_id_fkey(id, first_name, last_name)'
    )
    .eq('id', id)
    .single();

  if (!cc) notFound();

  const client = cc.client as any;

  // 60 giorni: servono anche i 30 precedenti per i confronti "vs periodo prima"
  const since = new Date();
  since.setDate(since.getDate() - 60);
  const sinceIso = since.toISOString().slice(0, 10);

  const [{ data: rawEntries }, { data: plan }] = await Promise.all([
    supabase
      .from('daily_biofeedback')
      .select('*')
      .eq('coach_client_id', cc.id)
      .gte('log_date', sinceIso)
      .order('log_date', { ascending: true }),
    supabase
      .from('nutrition_plans')
      .select('id, status, target_kcal, tdee_kcal')
      .eq('coach_client_id', cc.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Target kcal: target esplicito del piano attivo, poi TDEE, poi media kcal
  // dei giorni della settimana 1, altrimenti nessun target.
  let kcalTarget: number | null = toNum(plan?.target_kcal) ?? toNum(plan?.tdee_kcal);
  if (plan && kcalTarget == null) {
    const { data: days } = await supabase
      .from('nutrition_days')
      .select('kcal')
      .eq('nutrition_plan_id', plan.id)
      .eq('week_number', 1);
    const kcals = (days ?? [])
      .map((d) => toNum(d.kcal))
      .filter((n): n is number => n != null && n > 0);
    if (kcals.length > 0) {
      kcalTarget = Math.round(kcals.reduce((a, b) => a + b, 0) / kcals.length);
    }
  }

  const entries: BiofeedbackEntry[] = (rawEntries ?? []).map((r: any) => ({
    id: String(r.id),
    log_date: r.log_date,
    sleep_quality: toNum(r.sleep_quality),
    sleep_hours: toNum(r.sleep_hours),
    stress_level: toNum(r.stress_level),
    energy_level: toNum(r.energy_level),
    muscle_soreness: toNum(r.muscle_soreness),
    joint_stress: toNum(r.joint_stress),
    recovery: toNum(r.recovery),
    carbs_g: toNum(r.carbs_g),
    protein_g: toNum(r.protein_g),
    fat_g: toNum(r.fat_g),
    kcal_consumed: toNum(r.kcal_consumed),
    hydration_l: toNum(r.hydration_l),
    steps: toNum(r.steps),
    weight_kg: toNum(r.weight_kg),
    notes: r.notes ?? null,
  }));

  return (
    <div>
      <PageHeader
        title={`Monitoraggio & Biofeedback — ${client ? fullName(client) : (cc.invite_email ?? 'Cliente')}`}
        subtitle="Sonno, stress, energia, alimentazione e attività registrati quotidianamente dal cliente."
      />
      <BiofeedbackDashboard entries={entries} kcalTarget={kcalTarget} />
    </div>
  );
}
