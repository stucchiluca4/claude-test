import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, buttonSecondary } from '@/components/ui';
import { fullName, formatDate, formatKg } from '@/lib/utils';
import { WeightChart } from '@/components/weight-chart';
import { AiCoachWidget } from '@/components/ai-coach-widget';

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ demo?: string }>;
}) {
  const { id } = await params;
  const { demo } = await searchParams;

  if (demo === '1') {
    return <DemoClientDetail id={id} />;
  }

  const supabase = await createClient();

  const { data: cc } = await supabase
    .from('coach_clients')
    .select(
      'id, status, started_at, invite_email, client:profiles!coach_clients_client_id_fkey(id, first_name, last_name, sex, date_of_birth, height_cm)'
    )
    .eq('id', id)
    .single();

  if (!cc) notFound();

  const client = cc.client as any;

  const [{ data: intake }, { data: programs }, { data: plans }, { data: checkins }] =
    await Promise.all([
      supabase.from('client_intake').select('*').eq('coach_client_id', cc.id).maybeSingle(),
      supabase
        .from('programs')
        .select('id, name, goal, status, duration_weeks, start_date')
        .eq('coach_client_id', cc.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('nutrition_plans')
        .select('id, name, status, duration_weeks')
        .eq('coach_client_id', cc.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('checkins')
        .select('id, week_start, status, weight_kg, submitted_at')
        .eq('coach_client_id', cc.id)
        .order('week_start', { ascending: true }),
    ]);

  const weightSeries = (checkins ?? [])
    .filter((c) => c.weight_kg != null)
    .map((c) => ({ date: formatDate(c.week_start), peso: Number(c.weight_kg) }));

  const lastWeight = weightSeries.at(-1)?.peso;

  return (
    <div>
      <PageHeader
        title={client ? fullName(client) : (cc.invite_email ?? 'Cliente')}
        subtitle={
          cc.status === 'invited'
            ? "In attesa che il cliente accetti l'invito e compili il questionario."
            : `Cliente dal ${formatDate(cc.started_at)}`
        }
        actions={
          <>
            <Link href={`/allenamenti?cliente=${cc.id}`} className={buttonSecondary}>
              + Programma
            </Link>
            <Link href={`/nutrizione?cliente=${cc.id}`} className={buttonSecondary}>
              + Piano alimentare
            </Link>
            <Link href={`/clienti/${cc.id}/valutazione`} className={buttonSecondary}>
              📏 Valutazione corporea
            </Link>
            <Link href={`/clienti/${cc.id}/biofeedback`} className={buttonSecondary}>
              📊 Biofeedback
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Colonna anagrafica + anamnesi */}
        <Card>
          <h3 className="font-semibold mb-4">Anagrafica</h3>
          <dl className="space-y-2.5 text-sm">
            {[
              ['Sesso', client?.sex === 'male' ? 'Uomo' : client?.sex === 'female' ? 'Donna' : '—'],
              ['Data di nascita', formatDate(client?.date_of_birth)],
              ['Altezza', client?.height_cm ? `${client.height_cm} cm` : '—'],
              ['Peso attuale', lastWeight ? formatKg(lastWeight) : '—'],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between">
                <dt className="text-text-secondary">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>

          <h3 className="font-semibold mt-6 mb-4">Anamnesi</h3>
          {intake ? (
            <dl className="space-y-2.5 text-sm">
              {[
                ['Obiettivo', intake.primary_goal],
                ['Esperienza', intake.experience_level],
                ['Attività', intake.activity_level],
                ['Giorni/settimana', intake.weekly_availability],
                ['Infortuni', intake.injuries || 'Nessuno'],
                ['Limitazioni', intake.limitations || 'Nessuna'],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-4">
                  <dt className="text-text-secondary shrink-0">{k}</dt>
                  <dd className="text-right">{v ?? '—'}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-text-secondary">Questionario non ancora compilato.</p>
          )}
        </Card>

        {/* Colonna centrale: peso + check-in */}
        <Card className="lg:col-span-2">
          <h3 className="font-semibold mb-4">Andamento peso corporeo</h3>
          {weightSeries.length >= 2 ? (
            <WeightChart data={weightSeries} />
          ) : (
            <p className="text-sm text-text-secondary">
              Servono almeno 2 check-in con il peso per vedere il grafico.
            </p>
          )}

          <h3 className="font-semibold mt-8 mb-4">Ultimi check-in</h3>
          {(checkins ?? []).length === 0 ? (
            <p className="text-sm text-text-secondary">Nessun check-in ricevuto.</p>
          ) : (
            <ul className="space-y-2">
              {checkins!
                .slice(-5)
                .reverse()
                .map((ci) => (
                  <li key={ci.id} className="flex items-center justify-between text-sm">
                    <span>
                      Settimana del {formatDate(ci.week_start)} · {formatKg(ci.weight_kg)}
                    </span>
                    <span className="flex items-center gap-3">
                      <Badge
                        color={
                          ci.status === 'reviewed'
                            ? 'success'
                            : ci.status === 'submitted'
                              ? 'warning'
                              : 'default'
                        }
                      >
                        {ci.status === 'reviewed'
                          ? 'Rivisto'
                          : ci.status === 'submitted'
                            ? 'Da rivedere'
                            : 'In attesa'}
                      </Badge>
                      <Link href={`/checkin/${ci.id}`} className="text-accent hover:underline">
                        Apri →
                      </Link>
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        {/* AI Coach */}
        <div className="lg:col-span-3">
          <AiCoachWidget coachClientId={cc.id} />
        </div>

        {/* Programmi e piani */}
        <Card className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-4">🏋️ Programmi di allenamento</h3>
              {(programs ?? []).length === 0 ? (
                <p className="text-sm text-text-secondary">Nessun programma assegnato.</p>
              ) : (
                <ul className="space-y-2">
                  {programs!.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span>
                        {p.name}{' '}
                        <span className="text-text-secondary">({p.duration_weeks} sett.)</span>
                      </span>
                      <Link href={`/allenamenti/${p.id}`} className="text-accent hover:underline">
                        Apri →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="font-semibold mb-4">🍽️ Piani alimentari</h3>
              {(plans ?? []).length === 0 ? (
                <p className="text-sm text-text-secondary">Nessun piano assegnato.</p>
              ) : (
                <ul className="space-y-2">
                  {plans!.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span>{p.name}</span>
                      <Link href={`/nutrizione/${p.id}`} className="text-accent hover:underline">
                        Apri →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

const DEMO_CLIENTS: Record<string, { name: string; goal: string; sex: string; height: number; weight: number }> = {
  'demo-marco': { name: 'Marco Bellini', goal: 'Ipertrofia lean bulk', sex: 'Uomo', height: 178, weight: 76.1 },
  'demo-giulia': { name: 'Giulia Rinaldi', goal: 'Ricomp + glute focus', sex: 'Donna', height: 166, weight: 61.8 },
  'demo-andrea': { name: 'Andrea Costa', goal: 'Forza su squat', sex: 'Uomo', height: 181, weight: 82.4 },
  'demo-sofia': { name: 'Sofia Marino', goal: 'Dimagrimento sostenibile', sex: 'Donna', height: 170, weight: 68.2 },
};

function DemoClientDetail({ id }: { id: string }) {
  const client = DEMO_CLIENTS[id] ?? DEMO_CLIENTS['demo-marco'];
  const weightSeries = [
    { date: '01/07', peso: client.weight + 1.2 },
    { date: '08/07', peso: client.weight + 0.8 },
    { date: '15/07', peso: client.weight + 0.3 },
    { date: '22/07', peso: client.weight },
  ];

  return (
    <div>
      <PageHeader
        title={client.name}
        subtitle={`Cliente demo - ${client.goal}`}
        actions={
          <>
            <Link href="/allenamenti/demo-hypertrophy?demo=1" className={buttonSecondary}>+ Programma</Link>
            <Link href="/nutrizione/demo-lean-bulk?demo=1" className={buttonSecondary}>+ Piano alimentare</Link>
            <Link href={`/clienti/${id}/valutazione?demo=1`} className={buttonSecondary}>Valutazione corporea</Link>
            <Link href={`/clienti/${id}/biofeedback?demo=1`} className={buttonSecondary}>Biofeedback</Link>
          </>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <h3 className="font-semibold mb-4">Anagrafica</h3>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-text-secondary">Sesso</dt><dd>{client.sex}</dd></div>
            <div className="flex justify-between"><dt className="text-text-secondary">Età</dt><dd>32 anni</dd></div>
            <div className="flex justify-between"><dt className="text-text-secondary">Altezza</dt><dd>{client.height} cm</dd></div>
            <div className="flex justify-between"><dt className="text-text-secondary">Peso attuale</dt><dd>{formatKg(client.weight)}</dd></div>
          </dl>
          <h3 className="font-semibold mt-6 mb-4">Anamnesi</h3>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-text-secondary">Obiettivo</dt><dd className="text-right">{client.goal}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-text-secondary">Esperienza</dt><dd>Intermedio</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-text-secondary">Giorni/settimana</dt><dd>4</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-text-secondary">Limitazioni</dt><dd>Nessuna rilevante</dd></div>
          </dl>
        </Card>
        <Card className="lg:col-span-2">
          <h3 className="font-semibold mb-4">Andamento peso corporeo</h3>
          <WeightChart data={weightSeries} />
          <h3 className="font-semibold mt-8 mb-4">Ultimi check-in</h3>
          <ul className="space-y-2">
            {[
              ['demo-check-2', '22/07/2026', client.weight, 'reviewed'],
              ['demo-check-1', '15/07/2026', client.weight + 0.3, 'submitted'],
              ['demo-check-0', '08/07/2026', client.weight + 0.8, 'reviewed'],
            ].map(([checkId, week, weight, status]) => (
              <li key={checkId as string} className="flex items-center justify-between text-sm">
                <span>Settimana del {week} - {formatKg(weight as number)}</span>
                <span className="flex items-center gap-3">
                  <Badge color={status === 'reviewed' ? 'success' : 'warning'}>
                    {status === 'reviewed' ? 'Rivisto' : 'Da rivedere'}
                  </Badge>
                  <Link href={`/checkin/${checkId}?demo=1`} className="text-accent hover:underline">Apri</Link>
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-4">Programmi di allenamento</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between"><span>Hypertrophy Engine W5</span><Link href="/allenamenti/demo-hypertrophy?demo=1" className="text-accent">Apri</Link></li>
                <li className="flex justify-between"><span>Strength Reset</span><Link href="/allenamenti/demo-strength?demo=1" className="text-accent">Apri</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Piani alimentari</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between"><span>Lean Bulk 2740 kcal</span><Link href="/nutrizione/demo-lean-bulk?demo=1" className="text-accent">Apri</Link></li>
                <li className="flex justify-between"><span>Ricomp 2100 kcal ON/OFF</span><Link href="/nutrizione/demo-recomp?demo=1" className="text-accent">Apri</Link></li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
