import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState } from '@/components/ui';
import { fullName } from '@/lib/utils';
import { NewPlanForm } from './new-plan-form';

const DEMO_PLANS = [
  { id: 'demo-lean-bulk', name: 'Lean Bulk 2740 kcal', status: 'active', duration_weeks: 8, tdee_kcal: 2860, coach_client: { client: { first_name: 'Marco', last_name: 'Bellini' } } },
  { id: 'demo-recomp', name: 'Ricomp 2100 kcal ON/OFF', status: 'active', duration_weeks: 12, tdee_kcal: 2320, coach_client: { client: { first_name: 'Giulia', last_name: 'Rinaldi' } } },
  { id: 'demo-cut', name: 'Cut sostenibile 1900 kcal', status: 'draft', duration_weeks: 6, tdee_kcal: 2480, coach_client: { client: { first_name: 'Andrea', last_name: 'Costa' } } },
];

export default async function NutritionPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  if (demo === '1') {
    return <NutritionGrid plans={DEMO_PLANS} clientOptions={[]} demo />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: plans }, { data: clients }] = await Promise.all([
    supabase
      .from('nutrition_plans')
      .select(
        'id, name, status, duration_weeks, tdee_kcal, coach_client:coach_clients(client:profiles!coach_clients_client_id_fkey(first_name, last_name))'
      )
      .eq('created_by', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('coach_clients')
      .select('id, client:profiles!coach_clients_client_id_fkey(first_name, last_name)')
      .eq('coach_id', user!.id)
      .in('status', ['active', 'invited']),
  ]);

  const clientOptions = (clients ?? []).map((c) => ({
    id: c.id,
    label: c.client ? fullName(c.client as any) : 'Cliente invitato',
  }));

  return <NutritionGrid plans={plans ?? []} clientOptions={clientOptions} />;
}

function NutritionGrid({ plans, clientOptions, demo = false }: { plans: any[]; clientOptions: { id: string; label: string }[]; demo?: boolean }) {
  return (
    <div>
      <PageHeader
        title="Piani Alimentari"
        subtitle={demo ? 'Stessa sezione nutrizione, compilata con piani e macro demo.' : 'Calorie e macro per ogni giorno, con rotazione ON/OFF e calcolo TDEE.'}
        actions={demo ? <Badge color="accent">Demo</Badge> : <NewPlanForm clients={clientOptions} />}
      />

      {plans.length === 0 ? (
        <EmptyState
          emoji="🍽️"
          title="Nessun piano alimentare"
          description="Crea il primo piano: imposti calorie e macro per ogni giorno della settimana, con giorni di allenamento e riposo differenziati."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <Link key={p.id} href={demo ? `/nutrizione/${p.id}?demo=1` : `/nutrizione/${p.id}`}>
              <Card className="hover:bg-card-hover transition cursor-pointer h-full">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold">{p.name}</h3>
                  <Badge color={p.status === 'active' ? 'success' : 'default'}>
                    {p.status === 'active' ? 'Attivo' : 'Bozza'}
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary mt-2">
                  {p.duration_weeks} settimane
                  {p.tdee_kcal ? ` · TDEE ${p.tdee_kcal} kcal` : ''}
                </p>
                <p className="text-sm mt-3">
                  👤{' '}
                  {(p.coach_client as any)?.client
                    ? fullName((p.coach_client as any).client)
                    : '—'}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
