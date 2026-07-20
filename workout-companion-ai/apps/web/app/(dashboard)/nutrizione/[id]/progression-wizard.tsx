'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, buttonPrimary, inputClass } from '@/components/ui';
import {
  progressionPreview,
  weeklyAverage,
  macrosToKcal,
  type ProgressionMode,
} from '@wc/shared';
import { TrendingUp, TrendingDown, Scale } from 'lucide-react';

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

  return (
    <Card className="mt-4">
      <h3 className="font-semibold mb-1">Crea progressione</h3>
      <p className="text-sm text-text-secondary mb-5">
        Parte dalla Settimana 1 e genera automaticamente le settimane successive.
      </p>

      {/* 1. Modalità */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`text-left rounded-xl border p-4 transition ${
              mode === m.key ? 'border-accent bg-accent/10' : 'border-border hover:bg-card-hover'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-sm mb-1">
              <m.icon
                size={16}
                className={
                  m.key === 'bulk' ? 'text-success' : m.key === 'cut' ? 'text-danger' : 'text-warning'
                }
              />
              {m.label}
              {mode === m.key && <span className="ml-auto text-accent">✓</span>}
            </div>
            <p className="text-xs text-text-secondary">{m.desc}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. Impostazioni */}
        <div>
          <h4 className="text-sm font-semibold mb-3">
            Riferimento Settimana 1:{' '}
            <span className="text-text-secondary font-normal">
              {baseKcal} kcal · P {base.proteinG} · C {base.carbsG} · G {base.fatG}
            </span>
          </h4>

          <div className="flex gap-2 mb-4">
            {(
              [
                ['percent', '% Percentuale'],
                ['grams', '⚖ Grammi'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setIncrementType(k)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                  incrementType === k
                    ? 'border-accent bg-accent/10 font-medium'
                    : 'border-border text-text-secondary hover:bg-card-hover'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {(
              [
                ['Proteine', incProtein, setIncProtein],
                ['Carboidrati', incCarbs, setIncCarbs],
                ['Grassi', incFat, setIncFat],
              ] as const
            ).map(([label, value, setter]) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-sm text-text-secondary w-28">{label}</span>
                <input
                  type="number"
                  min={0}
                  step={incrementType === 'percent' ? 0.5 : 1}
                  value={value}
                  onChange={(e) => (setter as (n: number) => void)(Number(e.target.value))}
                  className={inputClass + ' w-24'}
                />
                <span className="text-sm text-text-secondary">
                  {incrementType === 'percent' ? '% per applicazione' : 'g per applicazione'}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-secondary w-28">Cadenza</span>
              <select
                value={cadence}
                onChange={(e) => setCadence(Number(e.target.value))}
                className={inputClass + ' w-40'}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    ogni {n} settiman{n === 1 ? 'a' : 'e'}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-secondary w-28">Durata</span>
              <input
                type="number"
                min={2}
                max={24}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className={inputClass + ' w-24'}
              />
              <span className="text-sm text-text-secondary">settimane</span>
            </div>
          </div>

          {/* 4. Condizioni */}
          <h4 className="text-sm font-semibold mt-5 mb-2">Condizioni di applicazione</h4>
          <div className="space-y-2">
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
                className={`flex gap-3 rounded-lg border p-3 cursor-pointer transition ${
                  condition === k ? 'border-accent bg-accent/10' : 'border-border'
                }`}
              >
                <input
                  type="radio"
                  checked={condition === k}
                  onChange={() => setCondition(k)}
                  className="mt-0.5 accent-blue-600"
                />
                <span className="text-sm">
                  <b>{label}</b>
                  <span className="block text-xs text-text-secondary mt-0.5">{desc}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* 3. Anteprima */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Anteprima progressione</h4>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-secondary border-b border-border text-xs">
                  <th className="px-3 py-2 font-medium">Settimana</th>
                  <th className="px-3 py-2 font-medium">Kcal</th>
                  <th className="px-3 py-2 font-medium">P (g)</th>
                  <th className="px-3 py-2 font-medium">C (g)</th>
                  <th className="px-3 py-2 font-medium">G (g)</th>
                </tr>
              </thead>
              <tbody>
                {preview
                  .filter((_, i) => i % Math.max(1, cadence) === 0 || i === preview.length - 1)
                  .map((w) => (
                    <tr key={w.week} className="border-b border-border last:border-0 tabular-nums">
                      <td className="px-3 py-1.5">
                        {w.week}
                        {w.week === 1 && <span className="text-text-secondary"> (base)</span>}
                      </td>
                      <td className="px-3 py-1.5 font-medium">{w.kcal}</td>
                      <td className="px-3 py-1.5">{w.proteinG}</td>
                      <td className="px-3 py-1.5">{w.carbsG}</td>
                      <td className="px-3 py-1.5">{w.fatG}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs mt-2 text-text-secondary">
            Variazione totale a fine progressione:{' '}
            <b className={totalDeltaPct >= 0 ? 'text-success' : 'text-danger'}>
              {totalDeltaPct > 0 ? '+' : ''}
              {totalDeltaPct}% kcal
            </b>
          </p>

          <button
            onClick={apply}
            disabled={applying || week1.length === 0}
            className={buttonPrimary + ' w-full mt-4'}
          >
            {applying ? 'Applicazione…' : '✓ Salva e applica al piano'}
          </button>
          {message && (
            <p className={`text-sm mt-2 ${message.startsWith('✓') ? 'text-success' : 'text-danger'}`}>
              {message}
            </p>
          )}
          <p className="text-xs text-text-secondary mt-3">
            💡 Ogni settimana replica la rotazione ON/OFF della Settimana 1, scalata secondo la
            progressione. Potrai comunque ritoccare ogni singolo giorno dalla tabella.
          </p>
        </div>
      </div>
    </Card>
  );
}
