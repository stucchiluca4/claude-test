import { notFound } from 'next/navigation';
import { Activity, ArrowDownRight, ArrowUpRight, History, LineChart, Ruler, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Badge, Card, KpiCard, PageHeader } from '@/components/ui';
import { fullName } from '@/lib/utils';
import { AssessmentPanel } from './assessment-panel';

export default async function BodyAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ demo?: string }>;
}) {
  const { id } = await params;
  const { demo } = await searchParams;

  if (demo === '1') {
    return <DemoAssessment id={id} />;
  }

  const supabase = await createClient();

  const { data: cc } = await supabase
    .from('coach_clients')
    .select(
      'id, invite_email, client:profiles!coach_clients_client_id_fkey(id, first_name, last_name, sex, date_of_birth)'
    )
    .eq('id', id)
    .single();

  if (!cc) notFound();

  const client = cc.client as any;

  const { data: assessments } = await supabase
    .from('body_assessments')
    .select('*')
    .eq('coach_client_id', cc.id)
    .order('measured_at', { ascending: false })
    .order('created_at', { ascending: false });

  const count = assessments?.length ?? 0;

  return (
    <div>
      <PageHeader
        title={`Valutazione corporea — ${client ? fullName(client) : (cc.invite_email ?? 'Cliente')}`}
        subtitle="Plicometria, circonferenze e stima della composizione corporea, rilevazione dopo rilevazione."
        actions={
          count > 0 ? (
            <Badge color="cyan">
              {count} {count === 1 ? 'rilevazione' : 'rilevazioni'}
            </Badge>
          ) : undefined
        }
      />
      <AssessmentPanel
        ccId={cc.id}
        sex={client?.sex ?? null}
        dateOfBirth={client?.date_of_birth ?? null}
        assessments={assessments ?? []}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modalità dimostrativa (?demo=1): stessa impaginazione della pagina  */
/* reale, con una scheda già compilata.                                */
/* ------------------------------------------------------------------ */

/** Andamento in SVG: nessun JavaScript, il ferro regge il grafico. */
function Sparkline({ values, label }: { values: number[]; label: string }) {
  const w = 320;
  const h = 72;
  const pad = 6;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, values.length - 1);
    const y = pad + (1 - (v - min) / span) * (h - pad * 2);
    return { x, y };
  });
  const line = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-[72px] w-full"
      role="img"
      aria-label={label}
    >
      <polygon points={`${pad},${h} ${line} ${w - pad},${h}`} fill="#64D2FF" fillOpacity={0.12} />
      <polyline
        points={line}
        fill="none"
        stroke="#64D2FF"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function DemoDelta({ text, good }: { text: string; good: boolean | null }) {
  if (good === null) {
    return <span className="text-[12px] font-semibold text-text-tertiary">{text}</span>;
  }
  const down = text.trim().startsWith('−') || text.trim().startsWith('-');
  return (
    <span
      className={`tnum flex items-center justify-end gap-1 text-[12px] font-semibold ${
        good ? 'text-mint' : 'text-rose'
      }`}
    >
      {down ? <ArrowDownRight size={12} aria-hidden /> : <ArrowUpRight size={12} aria-hidden />}
      {text}
    </span>
  );
}

function DemoAssessment({ id }: { id: string }) {
  const name = id.includes('giulia')
    ? 'Giulia Rinaldi'
    : id.includes('andrea')
      ? 'Andrea Costa'
      : 'Marco Bellini';

  const leanKg = 65.6;
  const fatKg = 10.5;
  const leanPct = (leanKg / (leanKg + fatKg)) * 100;

  const kpis = [
    { label: 'Peso', value: '76,1 kg', delta: '↓ −0,4 kg vs precedente', good: true },
    { label: 'Massa magra', value: '65,6 kg', delta: '↑ +0,3 kg vs precedente', good: true },
    { label: 'Massa grassa', value: '10,5 kg', delta: '↓ −0,7 kg vs precedente', good: true },
    { label: 'Somma pliche', value: '58,4 mm', delta: '↓ −2,1 mm vs precedente', good: true },
  ] as const;

  const circonferenze = [
    { label: 'Vita', value: '78,0 cm', delta: '−1,0 cm', good: true },
    { label: 'Torace', value: '103,0 cm', delta: '+1,0 cm', good: true },
    { label: 'Coscia', value: '58,0 cm', delta: 'invariata', good: null },
    { label: 'Bicipite contratto', value: '39,5 cm', delta: '+0,4 cm', good: true },
  ] as const;

  const storico = [
    { date: '10/03/2026', bf: 16.5, kg: '78,0 kg', pliche: '71,2 mm' },
    { date: '07/04/2026', bf: 15.9, kg: '77,6 kg', pliche: '67,8 mm' },
    { date: '12/05/2026', bf: 15.1, kg: '77,2 kg', pliche: '64,1 mm' },
    { date: '30/06/2026', bf: 14.4, kg: '76,5 kg', pliche: '60,5 mm' },
    { date: '28/07/2026', bf: 13.8, kg: '76,1 kg', pliche: '58,4 mm' },
  ] as const;

  return (
    <div>
      <PageHeader
        title={`Valutazione corporea — ${name}`}
        subtitle="Plicometria, circonferenze e composizione corporea: un esempio di scheda completa."
        actions={
          <>
            <Badge color="cyan">{storico.length} rilevazioni</Badge>
            <Badge color="accent">Demo</Badge>
          </>
        }
      />

      <div className="space-y-5">
        {/* DOMINANTE: la composizione di oggi, in un numero solo */}
        <Card beacon className="rise">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xs bg-cyan/15">
                <Activity size={17} className="text-cyan" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-[17px] font-bold leading-tight text-white">
                  Composizione attuale
                </h3>
                <p className="tnum mt-0.5 text-[12px] text-text-tertiary">
                  Rilevazione del 28/07/2026 · confronto con il 30/06/2026
                </p>
              </div>
            </div>
            <Badge color="cyan">Jackson-Pollock 3 pliche</Badge>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:gap-8">
            <div className="border-b border-line pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
              <span className="block text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                Grasso stimato
              </span>
              <div className="font-metric tnum mt-3 whitespace-nowrap text-[56px] font-extrabold leading-none text-cyan">
                13,8
                <span className="ml-1 text-[22px] font-bold text-text-tertiary">%</span>
              </div>
              <span className="tnum mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-mint">
                <ArrowDownRight size={15} aria-hidden />
                −0,6 punti
                <span className="font-medium text-text-tertiary">vs precedente</span>
              </span>
            </div>

            <div className="flex flex-col justify-center">
              <div
                className="flex h-3 w-full overflow-hidden rounded-full bg-raised"
                role="img"
                aria-label="Massa magra 65,6 chilogrammi, massa grassa 10,5 chilogrammi"
              >
                <span className="block h-full bg-cyan" style={{ width: `${leanPct}%` }} />
                <span className="block h-full bg-cyan/25" style={{ width: `${100 - leanPct}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                <span className="flex items-center gap-2 text-[13px] text-text-secondary">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan" aria-hidden />
                  Massa magra
                  <span className="tnum font-bold text-white">65,6 kg</span>
                </span>
                <span className="flex items-center gap-2 text-[13px] text-text-secondary">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan/25" aria-hidden />
                  Massa grassa
                  <span className="tnum font-bold text-white">10,5 kg</span>
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* I numeri di contorno */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {kpis.map((k) => (
            <KpiCard
              key={k.label}
              label={k.label}
              value={k.value}
              tone="cyan"
              delta={k.delta}
              deltaGood={k.good}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Circonferenze: contenuto denso su FERRO */}
          <Card className="rise rise-1 lg:col-span-2">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xs bg-cyan/15">
                <Ruler size={17} className="text-cyan" aria-hidden />
              </span>
              <h3 className="text-[17px] font-bold text-white">Circonferenze</h3>
            </div>

            {/* Tabella densa da 768px in su */}
            <div className="mt-5 hidden overflow-x-auto md:block">
              <table className="w-full text-[15px]">
                <thead>
                  <tr className="border-b border-line text-left text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                    <th className="py-2.5 pr-4 font-bold">Distretto</th>
                    <th className="py-2.5 pr-4 text-right font-bold">Misura</th>
                    <th className="py-2.5 text-right font-bold">Variazione</th>
                  </tr>
                </thead>
                <tbody>
                  {circonferenze.map((r) => (
                    <tr key={r.label} className="border-b border-line/60 last:border-0">
                      <td className="h-12 py-3.5 pr-4 text-white">{r.label}</td>
                      <td className="tnum py-3.5 pr-4 text-right font-semibold text-white">
                        {r.value}
                      </td>
                      <td className="py-3.5 text-right">
                        <DemoDelta text={r.delta} good={r.good} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sotto i 768px la tabella diventa una lista di card */}
            <ul className="mt-5 space-y-2.5 md:hidden">
              {circonferenze.map((r) => (
                <li
                  key={r.label}
                  className="flex items-center justify-between gap-3 rounded-xs bg-raised p-4"
                >
                  <span className="text-[15px] text-white">{r.label}</span>
                  <span className="text-right">
                    <span className="tnum block text-[15px] font-bold text-white">{r.value}</span>
                    <DemoDelta text={r.delta} good={r.good} />
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* La lettura del coach */}
          <Card className="rise rise-2">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xs bg-violet/15">
                <Sparkles size={17} className="text-violet" aria-hidden />
              </span>
              <h3 className="text-[17px] font-bold text-white">Nota del coach</h3>
            </div>
            <p className="mt-5 text-[15px] leading-relaxed text-text-secondary">
              Ricomposizione in corso: il peso resta quasi fermo, ma il girovita cala di un
              centimetro e la massa magra sale. Il piano regge, non toccare le calorie: tieni il
              deficit dov&apos;è e continua a monitorare le pliche ogni quattro settimane.
            </p>
            <div className="mt-6 rounded-xs bg-raised p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                Prossimo controllo
              </div>
              <div className="font-metric tnum mt-2 text-[24px] font-extrabold leading-none text-white">
                25/08/2026
              </div>
            </div>
          </Card>
        </div>

        {/* Andamento nel tempo */}
        <Card className="rise rise-3">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xs bg-cyan/15">
                <LineChart size={17} className="text-cyan" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-[17px] font-bold leading-tight text-white">
                  Andamento del grasso stimato
                </h3>
                <p className="mt-0.5 text-[12px] text-text-tertiary">
                  Cinque rilevazioni, da marzo a luglio
                </p>
              </div>
            </div>
            <span className="tnum text-[12px] font-semibold text-mint">
              −2,7 punti in cinque mesi
            </span>
          </div>

          <div className="mt-6">
            <Sparkline
              values={storico.map((s) => s.bf)}
              label="Percentuale di grasso stimato in calo da 16,5% a 13,8% tra marzo e luglio 2026"
            />
            <div className="mt-2 flex justify-between text-[11px] font-bold uppercase tracking-[0.06em] text-text-tertiary">
              <span className="tnum">{storico[0].date}</span>
              <span className="tnum">{storico[storico.length - 1].date}</span>
            </div>
          </div>
        </Card>

        {/* Storico */}
        <Card className="rise rise-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xs bg-raised">
                <History size={17} className="text-text-secondary" aria-hidden />
              </span>
              <h3 className="text-[17px] font-bold text-white">Storico valutazioni</h3>
            </div>
            <span className="text-[12px] font-semibold text-text-tertiary">
              ogni riga è confrontata con la rilevazione precedente
            </span>
          </div>

          {/* Tabella densa da 768px in su */}
          <div className="mt-5 hidden overflow-x-auto md:block">
            <table className="w-full text-[15px]">
              <thead>
                <tr className="border-b border-line text-left text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                  <th className="py-2.5 pr-4 font-bold">Data</th>
                  <th className="py-2.5 pr-4 text-right font-bold">Peso</th>
                  <th className="py-2.5 pr-4 text-right font-bold">Somma pliche</th>
                  <th className="py-2.5 text-right font-bold">% grasso</th>
                </tr>
              </thead>
              <tbody>
                {[...storico].reverse().map((r, i) => (
                  <tr key={r.date} className="border-b border-line/60 last:border-0">
                    <td className="tnum h-12 whitespace-nowrap py-3.5 pr-4 font-semibold text-white">
                      {r.date}
                      {i === 0 && (
                        <span className="ml-2 align-middle">
                          <Badge color="cyan">Ultima</Badge>
                        </span>
                      )}
                    </td>
                    <td className="tnum py-3.5 pr-4 text-right text-white">{r.kg}</td>
                    <td className="tnum py-3.5 pr-4 text-right text-white">{r.pliche}</td>
                    <td className="tnum py-3.5 text-right font-semibold text-white">
                      {r.bf.toLocaleString('it-IT', { minimumFractionDigits: 1 })} %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sotto i 768px la tabella diventa una lista di card */}
          <ul className="mt-5 space-y-2.5 md:hidden">
            {[...storico].reverse().map((r, i) => (
              <li key={r.date} className="rounded-xs bg-raised p-4">
                <div className="flex items-center gap-2">
                  <span className="tnum text-[15px] font-bold text-white">{r.date}</span>
                  {i === 0 && <Badge color="cyan">Ultima</Badge>}
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-x-4">
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                      Peso
                    </dt>
                    <dd className="tnum mt-1 text-[15px] text-white">{r.kg}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                      Pliche
                    </dt>
                    <dd className="tnum mt-1 text-[15px] text-white">{r.pliche}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                      % grasso
                    </dt>
                    <dd className="tnum mt-1 text-[15px] font-semibold text-white">
                      {r.bf.toLocaleString('it-IT', { minimumFractionDigits: 1 })} %
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
