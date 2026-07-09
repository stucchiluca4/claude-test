'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, Badge, buttonPrimary, buttonSecondary, inputClass } from '@/components/ui';
import {
  DAYS_OF_WEEK,
  PAL_LEVELS,
  calcBMR,
  katchMcArdleBMR,
  tdeeFromPal,
  macrosToKcal,
  carbFatRatio,
  weeklyAverage,
  ageFromBirthDate,
} from '@wc/shared';
import { ProgressionWizard } from './progression-wizard';
import { PlanOverview } from './plan-overview';

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
  tdee_formula: 'mifflin' | 'katch_mcardle';
  pal: number | null;
  target_kcal: number | null;
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

interface Assessment {
  lean_mass_kg: number | null;
  body_fat_pct: number | null;
  weight_kg: number | null;
}

export function MacroEditor({
  initialPlan,
  lastWeightKg,
  lastAssessment,
}: {
  initialPlan: PlanData;
  lastWeightKg: number | null;
  lastAssessment: Assessment | null;
}) {
  const supabase = createClient();
  const [plan, setPlan] = useState(initialPlan);
  const [days, setDays] = useState<DayRow[]>(
    [...initialPlan.nutrition_days].sort(
      (a, b) => a.week_number - b.week_number || a.day_of_week - b.day_of_week
    )
  );
  const [formula, setFormula] = useState<'mifflin' | 'katch_mcardle'>(
    initialPlan.tdee_formula ?? 'mifflin'
  );
  const [pal, setPal] = useState<number>(initialPlan.pal ?? 1.52);
  const [saving, setSaving] = useState(false);
  const [weekView, setWeekView] = useState(1);

  const client = plan.coach_client?.client ?? null;
  const canKatch = lastAssessment?.lean_mass_kg != null;

  // BMR secondo la formula scelta
  const bmr = useMemo(() => {
    if (formula === 'katch_mcardle') {
      return canKatch ? katchMcArdleBMR(lastAssessment!.lean_mass_kg!) : null;
    }
    if (!client?.sex || client.sex === 'other' || !client.date_of_birth || !client.height_cm || !lastWeightKg)
      return null;
    return calcBMR({
      sex: client.sex,
      weightKg: lastWeightKg,
      heightCm: client.height_cm,
      age: ageFromBirthDate(client.date_of_birth),
    });
  }, [formula, client, lastWeightKg, lastAssessment, canKatch]);

  const tdee = bmr != null ? tdeeFromPal(bmr, pal) : null;
  const [targetKcal, setTargetKcal] = useState<number | null>(initialPlan.target_kcal);
  const effectiveTarget = targetKcal ?? tdee?.tdee ?? null;

  const availableWeeks = Array.from(new Set(days.map((d) => d.week_number))).sort((a, b) => a - b);
  const weekDays = days.filter((d) => d.week_number === weekView);
  const avgKcal = weeklyAverage(weekDays.map((d) => d.kcal));
  const avgProtein = weeklyAverage(weekDays.map((d) => d.protein_g));
  const avgCarbs = weeklyAverage(weekDays.map((d) => d.carbs_g));
  const avgFat = weeklyAverage(weekDays.map((d) => d.fat_g));
  const totalWeekKcal = weekDays.reduce((a, d) => a + d.kcal, 0);

  async function updateDay(id: string, patch: Partial<DayRow>) {
    const updated = days.map((d) => (d.id === id ? { ...d, ...patch } : d));
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
    if (bmr == null || tdee == null) return;
    setSaving(true);
    await supabase
      .from('nutrition_plans')
      .update({
        tdee_formula: formula,
        pal,
        bmr_kcal: bmr,
        tdee_kcal: tdee.tdee,
        target_kcal: effectiveTarget,
      })
      .eq('id', plan.id);
    setSaving(false);
    setPlan({ ...plan, bmr_kcal: bmr, tdee_kcal: tdee.tdee, target_kcal: effectiveTarget, pal, tdee_formula: formula });
  }

  async function activatePlan() {
    await supabase.from('nutrition_plans').update({ status: 'active' }).eq('id', plan.id);
    setPlan({ ...plan, status: 'active' });
  }

  /** Ricarica i giorni dal DB (dopo l'applicazione di una progressione). */
  async function reloadDays() {
    const { data } = await supabase
      .from('nutrition_days')
      .select('id, week_number, day_of_week, day_type, kcal, protein_g, carbs_g, fat_g')
      .eq('nutrition_plan_id', plan.id)
      .order('week_number')
      .order('day_of_week');
    if (data) setDays(data as DayRow[]);
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

      {/* ------- Pannello Calcolo DEE (BMR/TDEE) ------- */}
      <Card className="mb-4">
        <h3 className="font-semibold mb-4">Calcolo DEE (BMR + fattore attività)</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm mb-1.5 text-text-secondary">Formula</label>
            <select
              value={formula}
              onChange={(e) => setFormula(e.target.value as typeof formula)}
              className={inputClass}
            >
              <option value="mifflin">Mifflin-St Jeor (da peso/altezza)</option>
              <option value="katch_mcardle" disabled={!canKatch}>
                Katch-McArdle (da pliche{canKatch ? '' : ' — serve una valutazione corporea'})
              </option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1.5 text-text-secondary">Fattore attività (PAL)</label>
            <select
              value={pal}
              onChange={(e) => setPal(Number(e.target.value))}
              className={inputClass}
            >
              {PAL_LEVELS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.value} — {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm">
            <div className="text-text-secondary">BMR</div>
            <div className="text-2xl font-bold">{bmr != null ? `${bmr} kcal` : '—'}</div>
          </div>
          <div className="text-sm">
            <div className="text-text-secondary">DEE (TDEE) stimato</div>
            <div className="text-2xl font-bold">{tdee ? `${tdee.tdee} kcal` : '—'}</div>
            {tdee && (
              <div className="text-xs text-text-secondary">
                Intervallo: {tdee.rangeMin} – {tdee.rangeMax} kcal
              </div>
            )}
          </div>
        </div>

        {bmr == null && (
          <p className="text-warning text-sm mt-3">
            {formula === 'katch_mcardle'
              ? 'Serve una valutazione corporea con massa magra: aprila dalla scheda cliente → "📏 Valutazione corporea".'
              : 'Per Mifflin servono sesso, data di nascita, altezza (profilo cliente) e un peso recente (check-in o valutazione).'}
          </p>
        )}

        {tdee && (
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border text-sm">
            <span className="text-text-secondary">
              Fabbisogno di mantenimento:{' '}
              <b className="text-success">
                {tdee.rangeMin} – {tdee.rangeMax} kcal/die
              </b>
            </span>
            <span className="flex items-center gap-2 ml-auto">
              <span className="text-text-secondary">TEE (valore usato nel piano)</span>
              <button
                className={buttonSecondary + ' !px-2.5 !py-1'}
                onClick={() => setTargetKcal((effectiveTarget ?? tdee.tdee) - 50)}
              >
                −
              </button>
              <b className="text-lg tabular-nums">{effectiveTarget}</b>
              <button
                className={buttonSecondary + ' !px-2.5 !py-1'}
                onClick={() => setTargetKcal((effectiveTarget ?? tdee.tdee) + 50)}
              >
                +
              </button>
              <span className="text-text-secondary">kcal/die</span>
              <button onClick={saveTdee} className={buttonPrimary + ' !py-1.5'}>
                💾 Salva
              </button>
            </span>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tabella macro settimanale */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-4">
            <span className="text-sm text-text-secondary">Settimana</span>
            {availableWeeks.map((w) => (
              <button
                key={w}
                onClick={() => setWeekView(w)}
                className={`px-2.5 py-1 rounded-md text-sm font-medium transition ${
                  weekView === w ? 'bg-accent text-white' : 'text-text-secondary hover:bg-card-hover'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
          <table className="w-full text-sm mt-3">
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
              {weekDays.map((d) => (
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
                  <td className="px-4 py-2.5 font-semibold tabular-nums">
                    {d.kcal.toLocaleString('it-IT')}
                  </td>
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
                        value={value}
                        onChange={(e) =>
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
                <td className="px-4 py-3 tabular-nums">{avgKcal.toLocaleString('it-IT')}</td>
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
            Totale settimana:{' '}
            <b className="text-text-primary">{totalWeekKcal.toLocaleString('it-IT')} kcal</b>
            {effectiveTarget != null && (
              <>
                {' · '}Media vs TEE:{' '}
                <b className={avgKcal >= effectiveTarget ? 'text-success' : 'text-warning'}>
                  {avgKcal - effectiveTarget > 0 ? '+' : ''}
                  {avgKcal - effectiveTarget} kcal/die
                </b>
              </>
            )}
          </div>
        </Card>

        {/* Riepilogo piano */}
        <Card>
          <h3 className="font-semibold mb-4">Riepilogo piano</h3>
          <dl className="space-y-2.5 text-sm">
            {(
              [
                ['Media calorie', `${avgKcal.toLocaleString('it-IT')} kcal`],
                ['Media proteine', `${avgProtein} g`],
                ['Media carboidrati', `${avgCarbs} g`],
                ['Media grassi', `${avgFat} g`],
                ['C:G Ratio medio', `${carbFatRatio(avgCarbs, avgFat)} : 1`],
                ['Durata', `${plan.duration_weeks} settimane`],
                ['Formula', formula === 'mifflin' ? 'Mifflin-St Jeor' : 'Katch-McArdle'],
                ['PAL', String(pal)],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <dt className="text-text-secondary">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {lastAssessment?.body_fat_pct != null && (
            <p className="text-xs text-text-secondary mt-4 pt-3 border-t border-border">
              Ultima valutazione corporea: {lastAssessment.body_fat_pct}% grasso ·{' '}
              {lastAssessment.lean_mass_kg} kg massa magra
            </p>
          )}
        </Card>
      </div>

      {/* ------- Panoramica (grafici multi-settimana) ------- */}
      <PlanOverview
        days={days}
        tdeeKcal={tdee?.tdee ?? plan.tdee_kcal}
        targetKcal={effectiveTarget}
      />

      {/* ------- Progressione (bulk / cut / mantenimento) ------- */}
      <ProgressionWizard
        planId={plan.id}
        planDurationWeeks={plan.duration_weeks}
        week1={days.filter((d) => d.week_number === 1)}
        onApplied={reloadDays}
      />
    </div>
  );
}
