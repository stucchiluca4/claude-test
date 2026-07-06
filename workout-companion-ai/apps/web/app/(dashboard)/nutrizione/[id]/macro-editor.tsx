'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, Badge, buttonPrimary, buttonSecondary, inputClass } from '@/components/ui';
import {
  DAYS_OF_WEEK,
  calcBMR,
  calcTDEE,
  macrosToKcal,
  carbFatRatio,
  weeklyAverage,
  ageFromBirthDate,
  type ActivityLevel,
} from '@wc/shared';

interface DayRow {
  id: string;
  week_number: number;
  day_of_week: number;
  day_type: 'training' | 'rest';
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface PlanData {
  id: string;
  name: string;
  status: string;
  duration_weeks: number;
  bmr_kcal: number | null;
  tdee_kcal: number | null;
  coach_client: {
    client: {
      first_name: string | null;
      last_name: string | null;
      sex: 'male' | 'female' | 'other' | null;
      date_of_birth: string | null;
      height_cm: number | null;
    } | null;
  } | null;
  nutrition_days: DayRow[];
}

export function MacroEditor({
  initialPlan,
  lastWeightKg,
}: {
  initialPlan: PlanData;
  lastWeightKg: number | null;
}) {
  const supabase = createClient();
  const [plan, setPlan] = useState(initialPlan);
  const [days, setDays] = useState<DayRow[]>(
    [...initialPlan.nutrition_days].sort((a, b) => a.day_of_week - b.day_of_week)
  );
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [saving, setSaving] = useState(false);

  const client = plan.coach_client?.client ?? null;

  // TDEE calcolabile solo se abbiamo sesso, data di nascita, altezza e peso
  const tdeeInfo = useMemo(() => {
    if (!client?.sex || client.sex === 'other' || !client.date_of_birth || !client.height_cm || !lastWeightKg)
      return null;
    const bmr = calcBMR({
      sex: client.sex,
      weightKg: lastWeightKg,
      heightCm: client.height_cm,
      age: ageFromBirthDate(client.date_of_birth),
    });
    return { bmr, tdee: calcTDEE(bmr, activity) };
  }, [client, lastWeightKg, activity]);

  const week1 = days.filter((d) => d.week_number === 1);
  const avgKcal = weeklyAverage(week1.map((d) => d.kcal));
  const avgProtein = weeklyAverage(week1.map((d) => d.protein_g));
  const avgCarbs = weeklyAverage(week1.map((d) => d.carbs_g));
  const avgFat = weeklyAverage(week1.map((d) => d.fat_g));
  const totalWeekKcal = week1.reduce((a, d) => a + d.kcal, 0);

  async function updateDay(id: string, patch: Partial<DayRow>) {
    const updated = days.map((d) => (d.id === id ? { ...d, ...patch } : d));
    // Ricalcola le kcal del giorno dai macro (fonte di verità: i grammi)
    const day = updated.find((d) => d.id === id)!;
    day.kcal = macrosToKcal({ proteinG: day.protein_g, carbsG: day.carbs_g, fatG: day.fat_g });
    setDays([...updated]);

    setSaving(true);
    await supabase
      .from('nutrition_days')
      .update({
        day_type: day.day_type,
        kcal: day.kcal,
        protein_g: day.protein_g,
        carbs_g: day.carbs_g,
        fat_g: day.fat_g,
      })
      .eq('id', id);
    setSaving(false);
  }

  async function saveTdee() {
    if (!tdeeInfo) return;
    await supabase
      .from('nutrition_plans')
      .update({ bmr_kcal: tdeeInfo.bmr, tdee_kcal: tdeeInfo.tdee })
      .eq('id', plan.id);
    setPlan({ ...plan, bmr_kcal: tdeeInfo.bmr, tdee_kcal: tdeeInfo.tdee });
  }

  async function activatePlan() {
    await supabase.from('nutrition_plans').update({ status: 'active' }).eq('id', plan.id);
    setPlan({ ...plan, status: 'active' });
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            {plan.name}
            <Badge color={plan.status === 'active' ? 'success' : 'default'}>
              {plan.status === 'active' ? 'Attivo' : 'Bozza'}
            </Badge>
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            {client ? `${client.first_name ?? ''} ${client.last_name ?? ''}` : ''} ·{' '}
            {plan.duration_weeks} settimane {saving && '· salvataggio…'}
          </p>
        </div>
        {plan.status !== 'active' && (
          <button onClick={activatePlan} className={buttonPrimary}>
            ✓ Attiva piano
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tabella macro settimanale */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-secondary border-b border-border">
                <th className="px-4 py-3 font-medium">Giorno</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Kcal</th>
                <th className="px-4 py-3 font-medium">Proteine (g)</th>
                <th className="px-4 py-3 font-medium">Carboidrati (g)</th>
                <th className="px-4 py-3 font-medium">Grassi (g)</th>
                <th className="px-4 py-3 font-medium">C:G</th>
              </tr>
            </thead>
            <tbody>
              {week1.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium">{DAYS_OF_WEEK[d.day_of_week - 1]}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() =>
                        updateDay(d.id, {
                          day_type: d.day_type === 'training' ? 'rest' : 'training',
                        })
                      }
                      className={`px-2 py-0.5 rounded-md text-xs font-semibold transition ${
                        d.day_type === 'training'
                          ? 'bg-accent text-white'
                          : 'bg-border text-text-secondary'
                      }`}
                    >
                      {d.day_type === 'training' ? 'ON' : 'OFF'}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 font-semibold">{d.kcal.toLocaleString('it-IT')}</td>
                  {(
                    [
                      ['protein_g', d.protein_g],
                      ['carbs_g', d.carbs_g],
                      ['fat_g', d.fat_g],
                    ] as const
                  ).map(([field, value]) => (
                    <td key={field} className="px-4 py-2.5">
                      <input
                        type="number"
                        min={0}
                        defaultValue={value}
                        onBlur={(e) =>
                          updateDay(d.id, { [field]: Number(e.target.value) } as Partial<DayRow>)
                        }
                        className={inputClass + ' !py-1 w-20'}
                      />
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-text-secondary">
                    {carbFatRatio(d.carbs_g, d.fat_g)} : 1
                  </td>
                </tr>
              ))}
              <tr className="bg-background/50 font-semibold">
                <td className="px-4 py-3" colSpan={2}>
                  Media settimanale
                </td>
                <td className="px-4 py-3">{avgKcal.toLocaleString('it-IT')}</td>
                <td className="px-4 py-3">{avgProtein} g</td>
                <td className="px-4 py-3">{avgCarbs} g</td>
                <td className="px-4 py-3">{avgFat} g</td>
                <td className="px-4 py-3 text-text-secondary">
                  {carbFatRatio(avgCarbs, avgFat)} : 1
                </td>
              </tr>
            </tbody>
          </table>
          <div className="px-4 py-3 text-sm text-text-secondary border-t border-border">
            Totale settimana: <b className="text-text-primary">{totalWeekKcal.toLocaleString('it-IT')} kcal</b>
            {' · '}Le kcal si ricalcolano automaticamente dai macro (4/4/9).
          </div>
        </Card>

        {/* Pannello TDEE */}
        <Card>
          <h3 className="font-semibold mb-4">Calcolo automatico TDEE</h3>
          {!tdeeInfo ? (
            <p className="text-sm text-text-secondary">
              Per calcolare BMR e TDEE servono: sesso, data di nascita, altezza (profilo cliente) e
              almeno un check-in con il peso.
            </p>
          ) : (
            <>
              <label className="block text-sm mb-1.5 text-text-secondary">Livello di attività</label>
              <select
                value={activity}
                onChange={(e) => setActivity(e.target.value as ActivityLevel)}
                className={inputClass}
              >
                <option value="sedentary">Sedentario</option>
                <option value="light">Leggermente attivo (1-2 workout)</option>
                <option value="moderate">Mediamente attivo (3-4 workout)</option>
                <option value="active">Molto attivo (5-6 workout)</option>
                <option value="very_active">Atleta / lavoro fisico</option>
              </select>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-text-secondary">BMR (metabolismo basale)</dt>
                  <dd className="font-semibold">{tdeeInfo.bmr} kcal</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-secondary">TDEE (fabbisogno totale)</dt>
                  <dd className="font-semibold">{tdeeInfo.tdee} kcal</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Media piano vs TDEE</dt>
                  <dd
                    className={
                      avgKcal > tdeeInfo.tdee ? 'text-success font-semibold' : 'text-warning font-semibold'
                    }
                  >
                    {avgKcal - tdeeInfo.tdee > 0 ? '+' : ''}
                    {avgKcal - tdeeInfo.tdee} kcal/die
                  </dd>
                </div>
              </dl>
              <button onClick={saveTdee} className={buttonSecondary + ' w-full mt-4'}>
                💾 Salva TDEE nel piano
              </button>
              <p className="text-xs text-text-secondary mt-3">
                Formula Mifflin-St Jeor. Surplus = costruzione muscolare, deficit = definizione.
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
