import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge, PageHeader } from '@/components/ui';
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
    // Serie deterministica ma "viva": onde sfasate, effetto weekend e una
    // settimana difficile, così i grafici mostrano davvero un andamento.
    const DEMO_NOTES: Record<number, string> = {
      6: 'Uscita con amici, cena fuori piano.',
      13: 'Settimana di lavoro pesante, poco sonno.',
      18: 'Gambe affaticate ma umore alto.',
    };
    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
    const round1 = (v: number) => Math.round(v * 10) / 10;

    const entries: BiofeedbackEntry[] = Array.from({ length: 21 }, (_, i) => {
      const date = new Date('2026-07-08T00:00:00Z');
      date.setDate(date.getDate() + i);
      const wave = Math.sin(i / 2.1);
      const slow = Math.sin(i / 5.5);
      const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
      const hardWeek = i >= 11 && i <= 15; // il periodo che il coach deve notare

      return {
        id: `demo-bio-${i}`,
        log_date: date.toISOString().slice(0, 10),
        sleep_quality: clamp(Math.round(7 + wave * 1.6 - (hardWeek ? 2 : 0)), 2, 10),
        sleep_hours: round1(clamp(7.2 + wave * 0.7 + (weekend ? 0.8 : 0) - (hardWeek ? 1 : 0), 4.5, 9.5)),
        stress_level: clamp(Math.round(4 - slow * 1.4 + (hardWeek ? 3 : 0)), 1, 10),
        energy_level: clamp(Math.round(7 + slow * 1.5 - (hardWeek ? 2 : 0)), 2, 10),
        muscle_soreness: clamp(Math.round(5 + wave * 2 + (hardWeek ? 1 : 0)), 1, 10),
        joint_stress: clamp(Math.round(3 + slow * 1.5), 1, 10),
        recovery: clamp(Math.round(7 + slow * 1.6 - (hardWeek ? 2 : 0)), 2, 10),
        carbs_g: Math.round(250 + wave * 35 + (weekend ? 40 : 0)),
        protein_g: Math.round(172 + slow * 8),
        fat_g: Math.round(72 + wave * 9 + (weekend ? 10 : 0)),
        kcal_consumed: Math.round(2420 + wave * 180 + (weekend ? 260 : 0)),
        hydration_l: round1(clamp(2.6 + slow * 0.5, 1.4, 3.8)),
        steps: Math.round(9200 + slow * 2400 + (weekend ? 1800 : 0)),
        weight_kg: round1(76.9 - i * 0.045 + wave * 0.25),
        notes: DEMO_NOTES[i] ?? null,
      };
    });

    return (
      <div>
        <PageHeader
          title={`Monitoraggio & Biofeedback — ${client}`}
          subtitle="Sonno, stress, energia, alimentazione e attività: come il cliente arriva davvero in palestra."
          actions={
            <>
              <Badge color="cyan">{entries.length} giorni registrati</Badge>
              <Badge color="accent">Demo</Badge>
            </>
          }
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
        subtitle="Sonno, stress, energia, alimentazione e attività: come il cliente arriva davvero in palestra."
        actions={
          entries.length > 0 ? (
            <>
              <Badge color="cyan">
                {entries.length} {entries.length === 1 ? 'giorno registrato' : 'giorni registrati'}
              </Badge>
              <Badge>ultimi 60 giorni</Badge>
            </>
          ) : undefined
        }
      />
      <BiofeedbackDashboard entries={entries} kcalTarget={kcalTarget} />
    </div>
  );
}
