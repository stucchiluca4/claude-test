'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, EmptyState, buttonPrimary, buttonSecondary, inputClass } from '@/components/ui';
import { formatDate, formatKg, cn } from '@/lib/utils';
import { bodyFatJP3, bodyComposition, ageFromBirthDate, JP3_SITES } from '@wc/shared';

interface Assessment {
  id: string;
  measured_at: string;
  weight_kg: number | null;
  sum_skinfolds_mm: number | null;
  body_fat_pct: number | null;
  fat_mass_kg: number | null;
  lean_mass_kg: number | null;
}

const SKINFOLD_SITES = [
  { key: 'tricipitale', label: 'Tricipitale' },
  { key: 'sottoscapolare', label: 'Sottoscapolare' },
  { key: 'addominale', label: 'Addominale' },
  { key: 'sovrailiaca', label: 'Sovrailiaca' },
  { key: 'coscia', label: 'Coscia' },
  { key: 'pettorale', label: 'Pettorale' },
] as const;

const CIRCUMFERENCES = [
  { key: 'collo', label: 'Collo' },
  { key: 'petto', label: 'Petto' },
  { key: 'vita', label: 'Vita' },
  { key: 'fianchi', label: 'Fianchi' },
  { key: 'coscia', label: 'Coscia' },
  { key: 'bicipite_rilassato', label: 'Bicipite rilassato' },
  { key: 'bicipite_contratto', label: 'Bicipite contratto' },
  { key: 'polpaccio', label: 'Polpaccio' },
  { key: 'spalle', label: 'Spalle', optional: true },
  { key: 'avambraccio', label: 'Avambraccio', optional: true },
] as const;

type SkinfoldState = Record<string, { dx: string; sx: string }>;

function emptySkinfolds(): SkinfoldState {
  return Object.fromEntries(SKINFOLD_SITES.map((s) => [s.key, { dx: '', sx: '' }]));
}

function emptyCircumferences(): Record<string, string> {
  return Object.fromEntries(CIRCUMFERENCES.map((c) => [c.key, '']));
}

/** Media dx/sx dei valori compilati per un sito (null se vuoto). */
function siteAvg(site: { dx: string; sx: string }): number | null {
  const vals = [site.dx, site.sx]
    .filter((v) => v !== '')
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Delta rispetto alla valutazione precedente, con freccia e colore. */
function Delta({
  label,
  delta,
  unit,
  goodWhenNegative,
}: {
  label: string;
  delta: number | null;
  unit: string;
  goodWhenNegative: boolean;
}) {
  if (delta == null) return null;
  const rounded = round1(delta);
  const arrow = rounded > 0 ? '↑' : rounded < 0 ? '↓' : '=';
  const good = goodWhenNegative ? rounded < 0 : rounded > 0;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-text-secondary">{label}</span>
      <span
        className={cn(
          'font-medium',
          rounded === 0 ? 'text-text-secondary' : good ? 'text-success' : 'text-danger'
        )}
      >
        {arrow} {rounded > 0 ? '+' : ''}
        {rounded.toLocaleString('it-IT')} {unit}
      </span>
    </span>
  );
}

export function AssessmentPanel({
  ccId,
  sex,
  dateOfBirth,
  assessments,
}: {
  ccId: string;
  sex: string | null;
  dateOfBirth: string | null;
  assessments: Assessment[];
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(assessments.length === 0);
  // Data locale (YYYY-MM-DD): con toISOString (UTC) tra mezzanotte e le 2
  // ora italiana verrebbe mostrato il giorno precedente.
  const [measuredAt, setMeasuredAt] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
  });
  const [weight, setWeight] = useState('');
  const [skinfolds, setSkinfolds] = useState<SkinfoldState>(emptySkinfolds);
  const [circumferences, setCircumferences] = useState<Record<string, string>>(
    emptyCircumferences
  );
  const [stato, setStato] = useState<'digiuno' | 'post_prandiale'>('digiuno');
  const [idratazione, setIdratazione] = useState<'bassa' | 'normale' | 'alta'>('normale');
  const [faseCiclo, setFaseCiclo] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ---- Calcoli live -------------------------------------------------------

  const averages: Record<string, number | null> = Object.fromEntries(
    SKINFOLD_SITES.map((s) => [s.key, siteAvg(skinfolds[s.key])])
  );

  const filledAverages = Object.values(averages).filter((v): v is number => v != null);
  const sumSkinfolds =
    filledAverages.length > 0 ? round1(filledAverages.reduce((a, b) => a + b, 0)) : null;

  const validSex = sex === 'male' || sex === 'female' ? sex : null;
  const age = dateOfBirth ? ageFromBirthDate(dateOfBirth) : null;
  const jp3Sites = validSex ? JP3_SITES[validSex] : JP3_SITES.male;
  const jp3Averages = validSex ? jp3Sites.map((site) => averages[site]) : [];
  const jp3Complete = validSex && age != null && jp3Averages.every((v) => v != null);

  const bodyFatPct = jp3Complete
    ? bodyFatJP3({
        sex: validSex!,
        age: age!,
        sum3Mm: (jp3Averages as number[]).reduce((a, b) => a + b, 0),
      })
    : null;

  const weightNum = weight !== '' && !isNaN(Number(weight)) ? Number(weight) : null;
  const composition =
    weightNum != null && weightNum > 0 && bodyFatPct != null
      ? bodyComposition(weightNum, bodyFatPct)
      : null;

  // ---- Azioni -------------------------------------------------------------

  function setSkinfold(site: string, side: 'dx' | 'sx', value: string) {
    setSkinfolds((prev) => ({ ...prev, [site]: { ...prev[site], [side]: value } }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const skinfoldsJson: Record<string, { dx?: number; sx?: number }> = {};
    for (const site of SKINFOLD_SITES) {
      const { dx, sx } = skinfolds[site.key];
      const entry: { dx?: number; sx?: number } = {};
      if (dx !== '' && !isNaN(Number(dx))) entry.dx = Number(dx);
      if (sx !== '' && !isNaN(Number(sx))) entry.sx = Number(sx);
      if (Object.keys(entry).length > 0) skinfoldsJson[site.key] = entry;
    }

    const circumferencesJson: Record<string, number> = {};
    for (const c of CIRCUMFERENCES) {
      const v = circumferences[c.key];
      if (v !== '' && !isNaN(Number(v))) circumferencesJson[c.key] = Number(v);
    }

    const supabase = createClient();
    const { error } = await supabase.from('body_assessments').insert({
      coach_client_id: ccId,
      measured_at: measuredAt,
      weight_kg: weightNum,
      skinfolds_mm: skinfoldsJson,
      circumferences_cm: circumferencesJson,
      conditions: {
        stato,
        idratazione,
        fase_ciclo: faseCiclo.trim() || null,
        note: note.trim(),
      },
      sum_skinfolds_mm: sumSkinfolds,
      body_fat_pct: bodyFatPct,
      fat_mass_kg: composition?.fatMassKg ?? null,
      lean_mass_kg: composition?.leanMassKg ?? null,
      notes: note.trim() || null,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }

    setWeight('');
    setSkinfolds(emptySkinfolds());
    setCircumferences(emptyCircumferences());
    setFaseCiclo('');
    setNote('');
    setFormOpen(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa valutazione? L’operazione non è reversibile.')) return;
    setDeletingId(id);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from('body_assessments').delete().eq('id', id);
    setDeletingId(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  const jp3SitesLabel = jp3Sites.join(', ');

  return (
    <div className="space-y-4">
      {/* ---- Nuova valutazione ---- */}
      <Card>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Nuova valutazione</h3>
          <button type="button" onClick={() => setFormOpen(!formOpen)} className={buttonSecondary}>
            {formOpen ? 'Chiudi' : '+ Nuova valutazione'}
          </button>
        </div>

        {formOpen && (
          <form onSubmit={handleSave} className="mt-5 space-y-6">
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div>
                <label className="block text-sm mb-1.5 text-text-secondary">Data</label>
                <input
                  type="date"
                  value={measuredAt}
                  onChange={(e) => setMeasuredAt(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1.5 text-text-secondary">Peso (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className={inputClass}
                  placeholder="es. 72,5"
                />
              </div>
            </div>

            {/* Pliche */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Pliche (mm)</h4>
              <div className="overflow-x-auto">
                <table className="w-full max-w-xl text-sm">
                  <thead>
                    <tr className="text-text-secondary">
                      <th className="text-left font-normal pb-2">Sito</th>
                      <th className="text-left font-normal pb-2">Lato destro</th>
                      <th className="text-left font-normal pb-2">Lato sinistro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SKINFOLD_SITES.map((site) => (
                      <tr key={site.key}>
                        <td className="py-1 pr-4">{site.label}</td>
                        <td className="py-1 pr-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={skinfolds[site.key].dx}
                            onChange={(e) => setSkinfold(site.key, 'dx', e.target.value)}
                            className={inputClass}
                          />
                        </td>
                        <td className="py-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={skinfolds[site.key].sx}
                            onChange={(e) => setSkinfold(site.key, 'sx', e.target.value)}
                            className={inputClass}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Circonferenze */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Circonferenze (cm)</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {CIRCUMFERENCES.map((c) => (
                  <div key={c.key}>
                    <label className="block text-sm mb-1.5 text-text-secondary">
                      {c.label}
                      {'optional' in c && c.optional && (
                        <span className="text-xs"> (opzionale)</span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={circumferences[c.key]}
                      onChange={(e) =>
                        setCircumferences((prev) => ({ ...prev, [c.key]: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Condizioni */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Condizioni di misurazione</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm mb-1.5 text-text-secondary">Stato</label>
                  <select
                    value={stato}
                    onChange={(e) => setStato(e.target.value as typeof stato)}
                    className={inputClass}
                  >
                    <option value="digiuno">Digiuno</option>
                    <option value="post_prandiale">Post-prandiale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1.5 text-text-secondary">Idratazione</label>
                  <select
                    value={idratazione}
                    onChange={(e) => setIdratazione(e.target.value as typeof idratazione)}
                    className={inputClass}
                  >
                    <option value="bassa">Bassa</option>
                    <option value="normale">Normale</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1.5 text-text-secondary">
                    Fase ciclo (opzionale)
                  </label>
                  <input
                    value={faseCiclo}
                    onChange={(e) => setFaseCiclo(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm mb-1.5 text-text-secondary">Note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Risultati live */}
            <Card className="bg-background">
              <h4 className="text-sm font-semibold mb-3">Risultati e stime</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Somma pliche</dt>
                  <dd>{sumSkinfolds != null ? `${sumSkinfolds.toLocaleString('it-IT')} mm` : '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary shrink-0">% grasso stimato (JP3)</dt>
                  <dd className="text-right">
                    {bodyFatPct != null ? (
                      `${bodyFatPct.toLocaleString('it-IT')} %`
                    ) : (
                      <span className="text-text-secondary">
                        Servono le 3 pliche {jp3SitesLabel} e sesso/età del cliente
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Massa grassa</dt>
                  <dd>{composition ? formatKg(composition.fatMassKg) : '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Massa magra</dt>
                  <dd>{composition ? formatKg(composition.leanMassKg) : '—'}</dd>
                </div>
              </dl>
            </Card>

            {error && <p className="text-danger text-sm">{error}</p>}

            <button type="submit" disabled={saving} className={buttonPrimary}>
              {saving ? 'Salvataggio…' : 'Salva valutazione'}
            </button>
          </form>
        )}
      </Card>

      {/* ---- Storico ---- */}
      <div>
        <h3 className="font-semibold mb-3">Storico valutazioni</h3>
        {!formOpen && error && <p className="text-danger text-sm mb-3">{error}</p>}
        {assessments.length === 0 ? (
          <EmptyState
            emoji="📏"
            title="Nessuna valutazione"
            description="Registra la prima valutazione corporea per monitorare la composizione del cliente nel tempo."
          />
        ) : (
          <div className="space-y-3">
            {assessments.map((a, i) => {
              const prev = assessments[i + 1];
              const delta = (
                curr: number | null,
                old: number | null | undefined
              ): number | null => (curr != null && old != null ? curr - old : null);
              return (
                <Card key={a.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">{formatDate(a.measured_at)}</div>
                      <dl className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-1 text-sm">
                        <div className="flex justify-between gap-3">
                          <dt className="text-text-secondary">Peso</dt>
                          <dd>{formatKg(a.weight_kg)}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-text-secondary">Somma pliche</dt>
                          <dd>
                            {a.sum_skinfolds_mm != null
                              ? `${Number(a.sum_skinfolds_mm).toLocaleString('it-IT')} mm`
                              : '—'}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-text-secondary">% grasso</dt>
                          <dd>
                            {a.body_fat_pct != null
                              ? `${Number(a.body_fat_pct).toLocaleString('it-IT')} %`
                              : '—'}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-text-secondary">Massa magra</dt>
                          <dd>{formatKg(a.lean_mass_kg)}</dd>
                        </div>
                      </dl>
                      {prev && (
                        <div className="mt-3 text-sm">
                          <span className="text-text-secondary">
                            Variazione rispetto alla precedente:{' '}
                          </span>
                          <span className="inline-flex flex-wrap gap-x-4 gap-y-1">
                            <Delta
                              label="pliche"
                              delta={delta(
                                a.sum_skinfolds_mm != null ? Number(a.sum_skinfolds_mm) : null,
                                prev.sum_skinfolds_mm != null
                                  ? Number(prev.sum_skinfolds_mm)
                                  : null
                              )}
                              unit="mm"
                              goodWhenNegative
                            />
                            <Delta
                              label="grasso"
                              delta={delta(
                                a.body_fat_pct != null ? Number(a.body_fat_pct) : null,
                                prev.body_fat_pct != null ? Number(prev.body_fat_pct) : null
                              )}
                              unit="%"
                              goodWhenNegative
                            />
                            <Delta
                              label="magra"
                              delta={delta(
                                a.lean_mass_kg != null ? Number(a.lean_mass_kg) : null,
                                prev.lean_mass_kg != null ? Number(prev.lean_mass_kg) : null
                              )}
                              unit="kg"
                              goodWhenNegative={false}
                            />
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(a.id)}
                      disabled={deletingId === a.id}
                      className="text-danger text-sm hover:underline disabled:opacity-50 shrink-0"
                    >
                      {deletingId === a.id ? 'Eliminazione…' : 'Elimina'}
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
