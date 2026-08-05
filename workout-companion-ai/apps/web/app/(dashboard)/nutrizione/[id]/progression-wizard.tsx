'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, buttonPrimary } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  progressionPreview,
  weeklyAverage,
  macrosToKcal,
  type ProgressionMode,
} from '@wc/shared';
import { AlertCircle, Check, CheckCircle2, Scale, TrendingDown, TrendingUp } from 'lucide-react';

interface DayRow {
  id: string;
  day_of_week: number;
  day_type: 'training' | 'rest';
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

const MODES: { key: ProgressionMode; label: string; desc: string; icon: typeof TrendingUp }[] = [
  {
    key: 'bulk',
    label: 'BULK',
    desc: 'Aumento graduale di kcal e macro per favorire la crescita muscolare.',
    icon: TrendingUp,
  },
  {
    key: 'cut',
    label: 'CUT',
    desc: 'Diminuzione graduale di kcal e macro per favorire la perdita di grasso.',
    icon: TrendingDown,
  },
  {
    key: 'maintenance',
    label: 'MANTENIMENTO',
    desc: 'Mantieni kcal e macro. Adatta solo in base a peso e performance.',
    icon: Scale,
  },
];

/* Ogni macro ha il suo segnale, identico a quello della griglia settimanale. */
const MACRO_FIELDS = [
  { label: 'Proteine', dot: 'bg-accent', text: 'text-accent' },
  { label: 'Carboidrati', dot: 'bg-amber', text: 'text-amber' },
  { label: 'Grassi', dot: 'bg-cyan', text: 'text-cyan' },
] as const;

const columnLabel = 'text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary';

const numberField =
  'tnum h-11 w-24 rounded-xs border border-transparent bg-raised px-3 text-center text-[15px] font-bold text-white transition hover:border-white/10 focus:border-accent focus:outline-none';

const selectField =
  'h-11 rounded-xs border border-transparent bg-raised px-3 text-[15px] font-semibold text-white transition hover:border-white/10 focus:border-accent focus:outline-none';

/**
 * Progressione nutrizionale: parte dalla Settimana 1 e genera
 * automaticamente le settimane successive con incrementi/decrementi.
 */
export function ProgressionWizard({
  planId,
  planDurationWeeks,
  week1,
  onApplied,
}: {
  planId: string;
  planDurationWeeks: number;
  week1: DayRow[];
  onApplied: () => void;
}) {
  const supabase = createClient();
  const [mode, setMode] = useState<ProgressionMode>('bulk');
  const [incrementType, setIncrementType] = useState<'percent' | 'grams'>('percent');
  const [incProtein, setIncProtein] = useState(5);
  const [incCarbs, setIncCarbs] = useState(5);
  const [incFat, setIncFat] = useState(5);
  const [cadence, setCadence] = useState(2);
  const [duration, setDuration] = useState(planDurationWeeks);
  const [condition, setCondition] = useState<'fixed' | 'stall'>('fixed');
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Base = medie della settimana 1
  const base = useMemo(
    () => ({
      proteinG: weeklyAverage(week1.map((d) => d.protein_g)),
      carbsG: weeklyAverage(week1.map((d) => d.carbs_g)),
      fatG: weeklyAverage(week1.map((d) => d.fat_g)),
    }),
    [week1]
  );
  const baseKcal = macrosToKcal(base);

  const preview = useMemo(
    () =>
      progressionPreview({
        base,
        mode,
        incrementType,
        increments: { proteinG: incProtein, carbsG: incCarbs, fatG: incFat },
        cadenceWeeks: cadence,
        durationWeeks: duration,
      }),
    [base, mode, incrementType, incProtein, incCarbs, incFat, cadence, duration]
  );

  /** Salva la progressione e genera i giorni delle settimane 2..N. */
  async function apply() {
    if (week1.length === 0) return;
    setApplying(true);
    setMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: err1 } = await supabase.from('nutrition_progressions').insert({
      nutrition_plan_id: planId,
      mode,
      increment_type: incrementType,
      protein_increment: incProtein,
      carbs_increment: incCarbs,
      fat_increment: incFat,
      cadence_weeks: cadence,
      duration_weeks: duration,
      apply_condition: condition,
      created_by: user!.id,
    });
    if (err1) {
      setMessage('Errore: ' + err1.message);
      setApplying(false);
      return;
    }

    // Ogni settimana N replica la rotazione della settimana 1, scalata
    // in proporzione ai macro previsti dalla progressione.
    const rows = [];
    for (const w of preview.filter((p) => p.week >= 2)) {
      const rP = base.proteinG > 0 ? w.proteinG / base.proteinG : 1;
      const rC = base.carbsG > 0 ? w.carbsG / base.carbsG : 1;
      const rF = base.fatG > 0 ? w.fatG / base.fatG : 1;
      for (const d of week1) {
        const protein_g = Math.round(d.protein_g * rP);
        const carbs_g = Math.round(d.carbs_g * rC);
        const fat_g = Math.round(d.fat_g * rF);
        rows.push({
          nutrition_plan_id: planId,
          week_number: w.week,
          day_of_week: d.day_of_week,
          day_type: d.day_type,
          protein_g,
          carbs_g,
          fat_g,
          kcal: macrosToKcal({ proteinG: protein_g, carbsG: carbs_g, fatG: fat_g }),
        });
      }
    }

    const { error: err2 } = await supabase
      .from('nutrition_days')
      .upsert(rows, { onConflict: 'nutrition_plan_id,week_number,day_of_week' });

    if (err2) {
      setApplying(false);
      setMessage('Errore: ' + err2.message);
      return;
    }

    // Elimina le settimane oltre la nuova durata: residui di una
    // progressione precedente più lunga resterebbero nel piano.
    const { error: err3 } = await supabase
      .from('nutrition_days')
      .delete()
      .eq('nutrition_plan_id', planId)
      .gt('week_number', duration);

    setApplying(false);
    if (err3) {
      setMessage('Errore nella pulizia delle settimane extra: ' + err3.message);
      return;
    }
    setMessage(`✓ Progressione applicata: generate le settimane 2–${duration}.`);
    onApplied();
  }

  const totalDeltaPct =
    baseKcal > 0 ? Math.round(((preview.at(-1)?.kcal ?? baseKcal) / baseKcal - 1) * 1000) / 10 : 0;

  const previewRows = preview.filter(
    (_, i) => i % Math.max(1, cadence) === 0 || i === preview.length - 1
  );
  const messageOk = message?.startsWith('✓') ?? false;
  const unit = incrementType === 'percent' ? '% per applicazione' : 'g per applicazione';

  return (
    <Card className="rise">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[17px] font-bold text-white">Crea la progressione</h2>
          <p className="mt-1 text-[13px] text-text-secondary">
            Quattro passi: la Settimana 1 resta la base, le successive vengono generate da qui.
          </p>
        </div>
        <span className="tnum shrink-0 rounded-full bg-raised px-3 py-1.5 text-[13px] font-bold text-white">
          Base: {baseKcal.toLocaleString('it-IT')} kcal
        </span>
      </div>

      {/* ===== 1. Modalità ===== */}
      <section aria-label="Modalità della progressione" className="mt-6">
        <StepHeader n={1} title="Scegli la direzione" hint="Decide il segno degli incrementi." />
        <div className="mt-3.5 grid grid-cols-1 gap-3 md:grid-cols-3">
          {MODES.map((m) => {
            const selected = mode === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                aria-pressed={selected}
                className={cn(
                  'press rounded-md border p-4 text-left transition',
                  selected
                    ? 'border-accent bg-accent/10'
                    : 'border-transparent bg-raised hover:border-white/10'
                )}
              >
                <div className="flex items-center gap-2">
                  <m.icon
                    size={17}
                    className={cn('shrink-0', selected ? 'text-accent' : 'text-text-secondary')}
                    aria-hidden
                  />
                  <span className="text-[15px] font-bold tracking-[0.04em] text-white">{m.label}</span>
                  {selected && <Check size={16} className="ml-auto shrink-0 text-accent" aria-hidden />}
                </div>
                <p className="mt-1.5 text-[13px] leading-snug text-text-secondary">{m.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          {/* ===== 2. Incrementi ===== */}
          <section aria-label="Incrementi della progressione">
            <StepHeader
              n={2}
              title="Imposta l’incremento"
              hint={`Riferimento Settimana 1: P ${base.proteinG} · C ${base.carbsG} · G ${base.fatG} g`}
            />

            <div
              role="group"
              aria-label="Unità dell’incremento"
              className="mt-3.5 inline-flex gap-1 rounded-full bg-raised p-1"
            >
              {(
                [
                  ['percent', 'Percentuale'],
                  ['grams', 'Grammi'],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setIncrementType(k)}
                  aria-pressed={incrementType === k}
                  className={cn(
                    'press h-10 rounded-full px-4 text-[13px] font-bold transition',
                    incrementType === k
                      ? 'bg-accent text-white'
                      : 'text-text-secondary hover:text-white'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-2.5">
              {(
                [
                  [0, incProtein, setIncProtein],
                  [1, incCarbs, setIncCarbs],
                  [2, incFat, setIncFat],
                ] as const
              ).map(([idx, value, setter]) => {
                const macro = MACRO_FIELDS[idx];
                return (
                  <div key={macro.label} className="flex flex-wrap items-center gap-3">
                    <label
                      htmlFor={`inc-${idx}`}
                      className="flex min-w-[8rem] items-center gap-2 text-[15px] font-semibold text-white"
                    >
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', macro.dot)} aria-hidden />
                      {macro.label}
                    </label>
                    <input
                      id={`inc-${idx}`}
                      type="number"
                      min={0}
                      step={incrementType === 'percent' ? 0.5 : 1}
                      value={value}
                      onChange={(e) => (setter as (n: number) => void)(Number(e.target.value))}
                      className={numberField}
                    />
                    <span className="text-[13px] text-text-secondary">{unit}</span>
                  </div>
                );
              })}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <label htmlFor="prog-cadence" className="min-w-[8rem] text-[15px] font-semibold text-white">
                  Cadenza
                </label>
                <select
                  id="prog-cadence"
                  value={cadence}
                  onChange={(e) => setCadence(Number(e.target.value))}
                  className={cn(selectField, 'w-44')}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      ogni {n} settiman{n === 1 ? 'a' : 'e'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label htmlFor="prog-duration" className="min-w-[8rem] text-[15px] font-semibold text-white">
                  Durata
                </label>
                <input
                  id="prog-duration"
                  type="number"
                  min={2}
                  max={24}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className={numberField}
                />
                <span className="text-[13px] text-text-secondary">settimane totali</span>
              </div>
            </div>
          </section>

          {/* ===== 3. Condizioni ===== */}
          <section aria-label="Condizioni di applicazione" className="mt-6">
            <StepHeader n={3} title="Quando si applica" hint="A calendario o solo quando serve." />
            <div className="mt-3.5 space-y-2">
              {(
                [
                  ['fixed', 'A cadenza fissa', 'Gli incrementi si applicano in automatico alla cadenza scelta.'],
                  [
                    'stall',
                    'Solo se il progresso rallenta',
                    'Applichi tu gli incrementi quando peso e carichi stallano per 2-3 settimane (consigliato per il cut).',
                  ],
                ] as const
              ).map(([k, label, desc]) => (
                <label
                  key={k}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-md border p-3.5 transition',
                    condition === k
                      ? 'border-accent bg-accent/10'
                      : 'border-transparent bg-raised hover:border-white/10'
                  )}
                >
                  <input
                    type="radio"
                    name="progression-condition"
                    checked={condition === k}
                    onChange={() => setCondition(k)}
                    className="mt-1 h-4 w-4 shrink-0 accent-accent"
                  />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-bold text-white">{label}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-text-secondary">
                      {desc}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* ===== 4. Anteprima ===== */}
        <section aria-label="Anteprima della progressione">
          <StepHeader n={4} title="Controlla l’anteprima" hint="Le settimane in cui qualcosa cambia." />

          <div className="mt-3.5 overflow-x-auto rounded-md bg-raised">
            <table className="w-full min-w-[26rem] text-left">
              <thead>
                <tr className="border-b border-line/60">
                  <th className={cn(columnLabel, 'px-4 py-3')}>Sett.</th>
                  <th className={cn(columnLabel, 'px-3 py-3 text-right')}>Kcal</th>
                  {MACRO_FIELDS.map((m) => (
                    <th key={m.label} className={cn(columnLabel, 'px-3 py-3 text-right')}>
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn('h-2 w-2 shrink-0 rounded-full', m.dot)} aria-hidden />
                        {m.label.charAt(0)} (g)
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((w) => {
                  const delta = w.kcal - baseKcal;
                  return (
                    <tr key={w.week} className="border-b border-line/40 last:border-b-0">
                      <td className="px-4 py-3">
                        <span className="tnum inline-flex h-8 min-w-[2rem] items-center justify-center rounded-full bg-card px-2 text-[15px] font-bold text-white">
                          {w.week}
                        </span>
                        {w.week === 1 && (
                          <span className="ml-2 text-[12px] font-bold uppercase tracking-[0.06em] text-text-tertiary">
                            base
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="font-metric tnum text-[20px] font-extrabold text-white">
                          {w.kcal.toLocaleString('it-IT')}
                        </span>
                        {delta !== 0 && (
                          <span className="tnum block text-[12px] font-semibold text-text-secondary">
                            {delta > 0 ? '+' : ''}
                            {delta.toLocaleString('it-IT')}
                          </span>
                        )}
                      </td>
                      <td className="tnum px-3 py-3 text-right text-[15px] font-semibold text-white">
                        {w.proteinG}
                      </td>
                      <td className="tnum px-3 py-3 text-right text-[15px] font-semibold text-white">
                        {w.carbsG}
                      </td>
                      <td className="tnum px-3 py-3 text-right text-[15px] font-semibold text-white">
                        {w.fatG}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="tnum mt-3 text-[13px] text-text-secondary">
            Variazione a fine progressione:{' '}
            <strong className="font-bold text-white">
              {totalDeltaPct > 0 ? '+' : ''}
              {totalDeltaPct}% di kcal
            </strong>{' '}
            rispetto alla Settimana 1.
          </p>

          <button
            onClick={apply}
            disabled={applying || week1.length === 0}
            className={cn(buttonPrimary, 'mt-4 min-h-[48px] w-full')}
          >
            {applying ? (
              'Applicazione…'
            ) : (
              <>
                <Check size={17} aria-hidden />
                Salva e applica al piano
              </>
            )}
          </button>

          {message && (
            <p
              role="status"
              className={cn(
                'mt-2.5 flex items-start gap-2 rounded-xs bg-raised px-3.5 py-3 text-[13px] leading-snug',
                messageOk ? 'text-mint' : 'text-rose'
              )}
            >
              {messageOk ? (
                <CheckCircle2 size={15} className="mt-0.5 shrink-0" aria-hidden />
              ) : (
                <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
              )}
              {message.replace(/^✓\s*/, '')}
            </p>
          )}

          <p className="mt-3 text-[13px] leading-relaxed text-text-secondary">
            Ogni settimana replica la rotazione ON/OFF della Settimana 1, scalata secondo la
            progressione. Potrai comunque ritoccare ogni singolo giorno dalla griglia qui sopra.
          </p>
        </section>
      </div>
    </Card>
  );
}

/** Passo del percorso: una pillola numerata, un titolo, una riga di contesto. */
function StepHeader({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className="tnum grid h-8 w-8 shrink-0 place-items-center rounded-full bg-raised text-[15px] font-bold text-white"
      >
        {n}
      </span>
      <div className="min-w-0">
        <h3 className="text-[15px] font-bold text-white">
          <span className="sr-only">Passo {n}: </span>
          {title}
        </h3>
        {hint && <p className="tnum mt-0.5 text-[13px] text-text-secondary">{hint}</p>}
      </div>
    </div>
  );
}
