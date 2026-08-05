'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Save,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, GlassBar, Badge, buttonPrimary, inputClass } from '@/components/ui';
import { cn } from '@/lib/utils';
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

/* Comandi che vivono sul livello VETRO: pillole a bordo capello. */
const iconOnGlass =
  'press grid shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.07] text-white transition hover:bg-white/[0.14] disabled:opacity-30 disabled:pointer-events-none';

/* Conferma: la menta è il colore di ciò che è compiuto. */
const buttonConfirm =
  'press inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-mint px-4 text-[15px] font-bold text-[#06120A] transition hover:brightness-110 disabled:opacity-45 disabled:pointer-events-none';

/* Etichette di colonna: sempre la stessa voce in tutta la sezione. */
const columnLabel = 'text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary';

/* Passo del TEE: bersagli da 44px su ferro, dentro un vassoio in rilievo. */
const stepperButton =
  'press grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card text-white transition hover:bg-[#252E3E] disabled:opacity-35 disabled:pointer-events-none';

/* Celle numeriche della griglia: compatte ma con bersaglio da 44px. */
const cellField =
  'tnum h-11 w-full rounded-xs border border-transparent bg-raised px-2 text-center text-[15px] font-semibold text-white transition hover:border-white/10 focus:border-accent focus:outline-none';

/* Ogni macro ha il suo segnale, identico ovunque nel prodotto. */
const MACROS = [
  { field: 'protein_g', label: 'Proteine', short: 'P', dot: 'bg-accent', text: 'text-accent', kcalPerG: 4 },
  { field: 'carbs_g', label: 'Carboidrati', short: 'C', dot: 'bg-amber', text: 'text-amber', kcalPerG: 4 },
  { field: 'fat_g', label: 'Grassi', short: 'G', dot: 'bg-cyan', text: 'text-cyan', kcalPerG: 9 },
] as const;

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
  /** Conferma effimera in menta dopo ogni scrittura andata a buon fine. */
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const client = plan.coach_client?.client ?? null;
  const canKatch = lastAssessment?.lean_mass_kg != null;

  /** "Salvato" resta visibile giusto il tempo di essere letto. */
  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 2600);
    return () => clearTimeout(t);
  }, [savedAt]);

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

  /* Quota di kcal coperta da ciascun macro: la lettura che il coach cerca. */
  const avgMacroKcal = avgProtein * 4 + avgCarbs * 4 + avgFat * 9 || 1;
  const macroAverages = { protein_g: avgProtein, carbs_g: avgCarbs, fat_g: avgFat };
  const deltaVsTarget = effectiveTarget != null ? avgKcal - effectiveTarget : null;

  const weekIdx = availableWeeks.indexOf(weekView);
  const trainingDays = weekDays.filter((d) => d.day_type === 'training').length;

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
    setSavedAt(Date.now());
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
    setSavedAt(Date.now());
    setPlan({ ...plan, bmr_kcal: bmr, tdee_kcal: tdee.tdee, target_kcal: effectiveTarget, pal, tdee_formula: formula });
  }

  async function activatePlan() {
    await supabase.from('nutrition_plans').update({ status: 'active' }).eq('id', plan.id);
    setPlan({ ...plan, status: 'active' });
    setSavedAt(Date.now());
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
    <div className="space-y-5">
      {/* ============ VETRO: la testata di comando, ancorata in alto ============ */}
      <GlassBar className="z-30 rounded-lg px-3.5 py-3 lg:sticky lg:top-6 lg:px-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link
              href="/nutrizione"
              aria-label="Torna a tutti i piani alimentari"
              className={cn(iconOnGlass, 'h-11 w-11')}
            >
              <ArrowLeft size={18} aria-hidden />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="truncate text-[19px] font-bold tracking-[-0.01em] text-white">
                  {plan.name}
                </h1>
                <Badge color={plan.status === 'active' ? 'success' : 'warning'}>
                  {plan.status === 'active' ? 'Attivo' : 'Bozza'}
                </Badge>
              </div>
              <p className="mt-0.5 truncate text-[13px] text-text-secondary">
                {client ? `${client.first_name ?? ''} ${client.last_name ?? ''} · ` : ''}
                <span className="tnum">{plan.duration_weeks} settimane</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Stato della scrittura: il salvataggio è automatico, si vede qui */}
            <span role="status" aria-live="polite" className="px-1 text-[13px] font-bold">
              {saving ? (
                <span className="inline-flex items-center gap-1.5 text-text-secondary">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden />
                  Salvataggio…
                </span>
              ) : savedAt ? (
                <span className="inline-flex items-center gap-1.5 text-mint">
                  <Check size={14} aria-hidden />
                  Salvato
                </span>
              ) : null}
            </span>

            {plan.status !== 'active' && (
              <button onClick={activatePlan} className={buttonConfirm}>
                <Check size={17} aria-hidden />
                <span className="hidden sm:inline">Attiva piano</span>
                <span className="sm:hidden">Attiva</span>
              </button>
            )}
          </div>
        </div>

        {/* Settimane: pillole selezionabili, scorrono senza muovere la pagina */}
        {availableWeeks.length > 0 && (
          <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
            <span className={cn(columnLabel, 'hidden shrink-0 pr-1 lg:block')} aria-hidden>
              Settimane
            </span>
            <button
              className={cn(iconOnGlass, 'h-10 w-10')}
              onClick={() => setWeekView(availableWeeks[Math.max(0, weekIdx - 1)])}
              disabled={weekIdx <= 0}
              aria-label="Settimana precedente"
            >
              <ChevronLeft size={17} aria-hidden />
            </button>

            <div className="min-w-0 flex-1 overflow-x-auto">
              <div className="flex gap-1.5" role="group" aria-label="Settimane del piano">
                {availableWeeks.map((w) => {
                  const selected = w === weekView;
                  return (
                    <button
                      key={w}
                      onClick={() => setWeekView(w)}
                      aria-pressed={selected}
                      aria-label={`Settimana ${w}`}
                      className={cn(
                        'press tnum grid h-10 min-w-[2.75rem] shrink-0 place-items-center rounded-full px-3 text-[15px] font-bold transition',
                        selected
                          ? 'bg-accent text-white'
                          : 'border border-white/10 bg-white/[0.07] text-text-secondary hover:bg-white/[0.14] hover:text-white'
                      )}
                    >
                      {w}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              className={cn(iconOnGlass, 'h-10 w-10')}
              onClick={() =>
                setWeekView(availableWeeks[Math.min(availableWeeks.length - 1, weekIdx + 1)])
              }
              disabled={weekIdx < 0 || weekIdx >= availableWeeks.length - 1}
              aria-label="Settimana successiva"
            >
              <ChevronRight size={17} aria-hidden />
            </button>
          </div>
        )}
      </GlassBar>

      {/* ============ I numeri della settimana in corso ============ */}
      <section
        aria-label={`Medie della settimana ${weekView}`}
        className="grid grid-cols-2 gap-4 md:grid-cols-4"
      >
        <MetricTile
          className="rise rise-1"
          label={`Media kcal · sett. ${weekView}`}
          value={avgKcal.toLocaleString('it-IT')}
          unit="kcal/die"
          hint={
            deltaVsTarget == null
              ? 'Nessun TEE impostato'
              : deltaVsTarget === 0
                ? 'In linea con il TEE'
                : `${deltaVsTarget > 0 ? '+' : ''}${deltaVsTarget.toLocaleString('it-IT')} kcal ${
                    deltaVsTarget > 0 ? 'sopra' : 'sotto'
                  } il TEE`
          }
          hintTone={deltaVsTarget === 0 ? 'mint' : deltaVsTarget == null ? 'muted' : 'amber'}
        />
        {MACROS.map((m, i) => {
          const grams = macroAverages[m.field];
          return (
            <MetricTile
              key={m.field}
              className={`rise rise-${i + 2}`}
              label={`${m.label} medie`}
              value={String(grams)}
              unit="g"
              tone={m.text}
              dot={m.dot}
              hint={`${Math.round(((grams * m.kcalPerG) / avgMacroKcal) * 100)}% delle kcal`}
              hintTone="muted"
            />
          );
        })}
      </section>

      {/* ============ IL FARO: la griglia settimana × giorno ============ */}
      <Card beacon className="rise rise-3 overflow-hidden p-0">
        <div className="flex flex-wrap items-start justify-between gap-3 px-6 pb-4 pt-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <CalendarRange size={19} className="shrink-0 text-text-secondary" aria-hidden />
              <h2 className="text-[17px] font-bold text-white">Settimana {weekView}</h2>
            </div>
            <p className="mt-1 text-[13px] text-text-secondary">
              Scrivi i grammi: le calorie si ricalcolano da sole (4/4/9) e il salvataggio è
              immediato.
            </p>
          </div>
          <span className="tnum shrink-0 rounded-full bg-raised px-3 py-1.5 text-[13px] font-bold text-white">
            {trainingDays} ON · {weekDays.length - trainingDays} OFF
          </span>
        </div>

        {weekDays.length === 0 ? (
          <p className="border-t border-line/60 px-6 py-10 text-center text-[15px] text-text-secondary">
            Questa settimana non ha ancora giorni. Genera le settimane successive dalla
            progressione, in fondo alla pagina.
          </p>
        ) : (
          <>
            {/* Griglia densa da 768px in su */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[54rem] border-t border-line/60 text-left">
                <thead>
                  <tr className="border-b border-line/60">
                    <th className={cn(columnLabel, 'px-6 py-3.5')}>Giorno</th>
                    <th className={cn(columnLabel, 'px-4 py-3.5')}>Tipo</th>
                    <th className={cn(columnLabel, 'px-4 py-3.5 text-right')}>Kcal</th>
                    {MACROS.map((m) => (
                      <th key={m.field} className={cn(columnLabel, 'px-4 py-3.5')}>
                        <span className="flex items-center gap-1.5">
                          <span className={cn('h-2 w-2 shrink-0 rounded-full', m.dot)} aria-hidden />
                          {m.label} (g)
                        </span>
                      </th>
                    ))}
                    <th className={cn(columnLabel, 'px-4 py-3.5 text-right')}>C : G</th>
                  </tr>
                </thead>
                <tbody>
                  {weekDays.map((d) => (
                    <tr
                      key={d.id}
                      className="border-b border-line/40 transition last:border-b-0 hover:bg-raised/50"
                    >
                      <td className="px-6 py-3 text-[15px] font-semibold text-white">
                        {DAYS_OF_WEEK[d.day_of_week - 1]}
                      </td>
                      <td className="px-4 py-3">
                        <DayTypeToggle
                          dayType={d.day_type}
                          dayName={DAYS_OF_WEEK[d.day_of_week - 1]}
                          onToggle={() =>
                            updateDay(d.id, {
                              day_type: d.day_type === 'training' ? 'rest' : 'training',
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-metric tnum text-[22px] font-extrabold text-white">
                          {d.kcal.toLocaleString('it-IT')}
                        </span>
                      </td>
                      {MACROS.map((m) => (
                        <td key={m.field} className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            value={d[m.field]}
                            onChange={(e) =>
                              updateDay(d.id, { [m.field]: Number(e.target.value) } as Partial<DayRow>)
                            }
                            aria-label={`${m.label} di ${DAYS_OF_WEEK[d.day_of_week - 1]} in grammi`}
                            className={cn(cellField, 'max-w-[7rem]')}
                          />
                        </td>
                      ))}
                      <td className="tnum px-4 py-3 text-right text-[15px] text-text-secondary">
                        {carbFatRatio(d.carbs_g, d.fat_g) ?? '—'} : 1
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-raised">
                    <td className={cn(columnLabel, 'px-6 py-4 text-white')} colSpan={2}>
                      Media settimanale
                    </td>
                    <td className="tnum px-4 py-4 text-right text-[17px] font-bold text-white">
                      {avgKcal.toLocaleString('it-IT')}
                    </td>
                    {MACROS.map((m) => (
                      <td
                        key={m.field}
                        className={cn('tnum px-4 py-4 text-[17px] font-bold', m.text)}
                      >
                        {macroAverages[m.field]} g
                      </td>
                    ))}
                    <td className="tnum px-4 py-4 text-right text-[15px] text-text-secondary">
                      {carbFatRatio(avgCarbs, avgFat) ?? '—'} : 1
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Sotto 768px ogni giorno diventa una card */}
            <ul className="border-t border-line/60 md:hidden">
              {weekDays.map((d) => (
                <li key={d.id} className="border-b border-line/40 px-5 py-4 last:border-b-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="truncate text-[17px] font-bold text-white">
                        {DAYS_OF_WEEK[d.day_of_week - 1]}
                      </span>
                      <DayTypeToggle
                        dayType={d.day_type}
                        dayName={DAYS_OF_WEEK[d.day_of_week - 1]}
                        onToggle={() =>
                          updateDay(d.id, {
                            day_type: d.day_type === 'training' ? 'rest' : 'training',
                          })
                        }
                      />
                    </div>
                    <span className="font-metric tnum shrink-0 text-[26px] font-extrabold leading-none text-white">
                      {d.kcal.toLocaleString('it-IT')}
                      <span className="ml-1 text-[13px] font-semibold text-text-secondary">kcal</span>
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {MACROS.map((m) => (
                      <label key={m.field} className="block">
                        <span className={cn(columnLabel, 'flex items-center gap-1.5')}>
                          <span className={cn('h-2 w-2 shrink-0 rounded-full', m.dot)} aria-hidden />
                          {m.short} (g)
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={d[m.field]}
                          onChange={(e) =>
                            updateDay(d.id, { [m.field]: Number(e.target.value) } as Partial<DayRow>)
                          }
                          aria-label={`${m.label} di ${DAYS_OF_WEEK[d.day_of_week - 1]} in grammi`}
                          className={cn(cellField, 'mt-1.5')}
                        />
                      </label>
                    ))}
                  </div>
                  <p className="tnum mt-2.5 text-[13px] text-text-secondary">
                    C : G {carbFatRatio(d.carbs_g, d.fat_g) ?? '—'} : 1
                  </p>
                </li>
              ))}
              <li className="tnum flex items-baseline justify-between gap-3 bg-raised px-5 py-4">
                <span className={cn(columnLabel, 'text-white')}>Media settimanale</span>
                <span className="text-[17px] font-bold text-white">
                  {avgKcal.toLocaleString('it-IT')} kcal
                </span>
              </li>
            </ul>

            <p className="tnum border-t border-line/60 px-6 py-4 text-[13px] text-text-secondary">
              Totale settimana:{' '}
              <strong className="font-bold text-white">
                {totalWeekKcal.toLocaleString('it-IT')} kcal
              </strong>
              {deltaVsTarget != null && (
                <>
                  {' · '}media giornaliera{' '}
                  <strong className={cn('font-bold', deltaVsTarget === 0 ? 'text-mint' : 'text-amber')}>
                    {deltaVsTarget > 0 ? '+' : ''}
                    {deltaVsTarget.toLocaleString('it-IT')} kcal
                  </strong>{' '}
                  rispetto al TEE di {effectiveTarget?.toLocaleString('it-IT')} kcal
                </>
              )}
            </p>
          </>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ============ Calcolo del fabbisogno ============ */}
        <Card className="rise rise-4 lg:col-span-2">
          <h2 className="text-[17px] font-bold text-white">Fabbisogno energetico</h2>
          <p className="mt-1 text-[13px] text-text-secondary">
            Metabolismo basale per la formula scelta, moltiplicato per il fattore di attività.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="tdee-formula" className={columnLabel}>
                Formula
              </label>
              <select
                id="tdee-formula"
                value={formula}
                onChange={(e) => setFormula(e.target.value as typeof formula)}
                className={cn(inputClass, 'mt-2')}
              >
                <option value="mifflin">Mifflin-St Jeor (da peso e altezza)</option>
                <option value="katch_mcardle" disabled={!canKatch}>
                  Katch-McArdle (da massa magra{canKatch ? '' : ' — serve una valutazione corporea'})
                </option>
              </select>
            </div>
            <div>
              <label htmlFor="tdee-pal" className={columnLabel}>
                Fattore attività (PAL)
              </label>
              <select
                id="tdee-pal"
                value={pal}
                onChange={(e) => setPal(Number(e.target.value))}
                className={cn(inputClass, 'mt-2')}
              >
                {PAL_LEVELS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.value} — {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-md bg-raised px-4 py-3.5">
              <dt className={columnLabel}>Metabolismo basale</dt>
              <dd className="font-metric tnum mt-1.5 text-[28px] font-extrabold leading-none text-white">
                {bmr != null ? bmr.toLocaleString('it-IT') : '—'}
                <span className="ml-1.5 text-[13px] font-semibold text-text-secondary">kcal</span>
              </dd>
            </div>
            <div className="rounded-md bg-raised px-4 py-3.5">
              <dt className={columnLabel}>Dispendio totale (DEE)</dt>
              <dd className="font-metric tnum mt-1.5 text-[28px] font-extrabold leading-none text-white">
                {tdee ? tdee.tdee.toLocaleString('it-IT') : '—'}
                <span className="ml-1.5 text-[13px] font-semibold text-text-secondary">kcal</span>
              </dd>
              {tdee && (
                <p className="tnum mt-1.5 text-[13px] text-text-secondary">
                  Mantenimento tra {tdee.rangeMin.toLocaleString('it-IT')} e{' '}
                  {tdee.rangeMax.toLocaleString('it-IT')} kcal/die
                </p>
              )}
            </div>
          </dl>

          {bmr == null && (
            <p
              role="status"
              className="mt-4 flex items-start gap-2 rounded-xs bg-raised px-3.5 py-3 text-[13px] leading-snug text-amber"
            >
              <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
              {formula === 'katch_mcardle'
                ? 'Serve una valutazione corporea con la massa magra: la trovi nella scheda cliente, sezione «Valutazione corporea».'
                : 'Per Mifflin servono sesso, data di nascita e altezza nel profilo cliente, più un peso recente da check-in o valutazione.'}
            </p>
          )}

          {tdee && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line/60 pt-4">
              <div className="min-w-0">
                <p className={columnLabel}>TEE — calorie usate nel piano</p>
                <p className="mt-1 text-[13px] text-text-secondary">
                  Parti dal DEE e sposta di 50 kcal alla volta.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-full bg-raised p-1">
                  <button
                    className={stepperButton}
                    onClick={() => setTargetKcal((effectiveTarget ?? tdee.tdee) - 50)}
                    aria-label="Cinquanta kcal in meno"
                  >
                    <Minus size={17} aria-hidden />
                  </button>
                  <span className="font-metric tnum min-w-[5.5rem] text-center text-[28px] font-extrabold leading-none text-white">
                    {effectiveTarget?.toLocaleString('it-IT')}
                  </span>
                  <button
                    className={stepperButton}
                    onClick={() => setTargetKcal((effectiveTarget ?? tdee.tdee) + 50)}
                    aria-label="Cinquanta kcal in più"
                  >
                    <Plus size={17} aria-hidden />
                  </button>
                </div>
                <button onClick={saveTdee} className={cn(buttonPrimary, 'min-h-[44px]')}>
                  <Save size={16} aria-hidden />
                  Salva fabbisogno
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* ============ Riepilogo del piano ============ */}
        <Card className="rise rise-5">
          <h2 className="text-[17px] font-bold text-white">Riepilogo piano</h2>
          <dl className="mt-4 divide-y divide-line/50">
            {(
              [
                ['Media calorie', `${avgKcal.toLocaleString('it-IT')} kcal`, null],
                ['Media proteine', `${avgProtein} g`, 'bg-accent'],
                ['Media carboidrati', `${avgCarbs} g`, 'bg-amber'],
                ['Media grassi', `${avgFat} g`, 'bg-cyan'],
                ['C : G ratio medio', `${carbFatRatio(avgCarbs, avgFat) ?? '—'} : 1`, null],
                ['Durata', `${plan.duration_weeks} settimane`, null],
                ['Formula', formula === 'mifflin' ? 'Mifflin-St Jeor' : 'Katch-McArdle', null],
                ['PAL', String(pal), null],
              ] as const
            ).map(([k, v, dot]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0">
                <dt className="flex items-center gap-2 text-[15px] text-text-secondary">
                  {dot && <span className={cn('h-2 w-2 shrink-0 rounded-full', dot)} aria-hidden />}
                  {k}
                </dt>
                <dd className="tnum shrink-0 text-[15px] font-semibold text-white">{v}</dd>
              </div>
            ))}
          </dl>
          {lastAssessment?.body_fat_pct != null && (
            <p className="tnum mt-4 rounded-xs bg-raised px-3.5 py-3 text-[13px] leading-snug text-text-secondary">
              Ultima valutazione corporea:{' '}
              <strong className="font-bold text-white">{lastAssessment.body_fat_pct}%</strong> di
              grasso ·{' '}
              <strong className="font-bold text-white">{lastAssessment.lean_mass_kg} kg</strong> di
              massa magra
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

/** Interruttore ON/OFF del giorno: lo stato è nel testo, non solo nel colore. */
function DayTypeToggle({
  dayType,
  dayName,
  onToggle,
}: {
  dayType: 'training' | 'rest';
  dayName: string;
  onToggle: () => void;
}) {
  const training = dayType === 'training';
  return (
    <button
      onClick={onToggle}
      aria-pressed={training}
      aria-label={`${dayName}: ${training ? 'giorno di allenamento' : 'giorno di riposo'} — tocca per invertire`}
      className={cn(
        'press inline-flex h-9 min-w-[3.75rem] items-center justify-center rounded-full px-3 text-[13px] font-bold tracking-[0.04em] transition',
        training ? 'bg-accent text-white' : 'bg-raised text-text-secondary hover:text-white'
      )}
    >
      {training ? 'ON' : 'OFF'}
    </button>
  );
}

/** Tassello metrico su FERRO: un numero grande, la sua unità, una riga di contesto. */
function MetricTile({
  label,
  value,
  unit,
  hint,
  hintTone = 'muted',
  tone = 'text-white',
  dot,
  className,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  hintTone?: 'muted' | 'mint' | 'amber';
  tone?: string;
  dot?: string;
  className?: string;
}) {
  const hintClass = {
    muted: 'text-text-secondary',
    mint: 'text-mint',
    amber: 'text-amber',
  }[hintTone];

  return (
    <Card className={cn('p-5', className)}>
      <div className={cn(columnLabel, 'flex items-center gap-1.5')}>
        {dot && <span className={cn('h-2 w-2 shrink-0 rounded-full', dot)} aria-hidden />}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className={cn('font-metric tnum text-[36px] font-extrabold leading-none', tone)}>
          {value}
        </span>
        {unit && <span className="text-[13px] font-semibold text-text-secondary">{unit}</span>}
      </div>
      {hint && <p className={cn('tnum mt-2 text-[13px] font-semibold', hintClass)}>{hint}</p>}
    </Card>
  );
}
