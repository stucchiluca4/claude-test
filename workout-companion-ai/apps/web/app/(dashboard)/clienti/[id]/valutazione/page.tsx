import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge, Card, PageHeader } from '@/components/ui';
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

  return (
    <div>
      <PageHeader
        title={`Valutazione corporea — ${client ? fullName(client) : (cc.invite_email ?? 'Cliente')}`}
        subtitle="Plicometria, circonferenze e stima della composizione corporea."
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

function DemoAssessment({ id }: { id: string }) {
  const name = id.includes('giulia') ? 'Giulia Rinaldi' : id.includes('andrea') ? 'Andrea Costa' : 'Marco Bellini';
  const rows = [
    ['Peso', '76,1 kg', '-0,4 kg vs precedente'],
    ['Body fat stimata', '13,8%', '-0,6%'],
    ['Massa magra', '65,6 kg', '+0,3 kg'],
    ['Vita', '78 cm', '-1 cm'],
    ['Torace', '103 cm', '+1 cm'],
    ['Coscia', '58 cm', 'stabile'],
  ];

  return (
    <div>
      <PageHeader
        title={`Valutazione corporea - ${name}`}
        subtitle="Plicometria, circonferenze e composizione corporea demo."
        actions={<Badge color="accent">Demo</Badge>}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <h3 className="font-semibold mb-4">Riepilogo</h3>
          <div className="space-y-3">
            {rows.slice(0, 3).map(([label, value, delta]) => (
              <div key={label} className="rounded-xl border border-border bg-background/60 p-3">
                <p className="text-xs text-text-secondary">{label}</p>
                <p className="mt-1 text-2xl font-black text-white">{value}</p>
                <p className="text-xs text-accent">{delta}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <h3 className="font-semibold mb-4">Circonferenze</h3>
          <table className="w-full text-sm">
            <tbody>
              {rows.slice(3).map(([label, value, delta]) => (
                <tr key={label} className="border-b border-border last:border-0">
                  <td className="py-3 text-text-secondary">{label}</td>
                  <td className="py-3 font-bold">{value}</td>
                  <td className="py-3 text-right text-accent">{delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-6 rounded-xl border border-border bg-background/60 p-4">
            <h4 className="font-semibold text-white">Nota coach</h4>
            <p className="mt-2 text-sm text-text-secondary">
              Buona ricomposizione: peso quasi stabile, girovita in calo e massa magra in lieve aumento.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
