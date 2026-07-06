import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, buttonSecondary } from '@/components/ui';
import { fullName, formatDate, formatKg } from '@/lib/utils';
import { WeightChart } from '@/components/weight-chart';
import { AiCoachWidget } from '@/components/ai-coach-widget';

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: cc } = await supabase
    .from('coach_clients')
    .select(
      'id, status, started_at, invite_email, client:profiles!coach_clients_client_id_fkey(id, first_name, last_name, sex, date_of_birth, height_cm)'
    )
    .eq('id', params.id)
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
