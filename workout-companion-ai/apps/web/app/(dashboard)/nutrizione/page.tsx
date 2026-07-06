import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState } from '@/components/ui';
import { fullName } from '@/lib/utils';
import { NewPlanForm } from './new-plan-form';

export default async function NutritionPage() {
  const supabase = createClient();
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

  return (
    <div>
      <PageHeader
        title="Piani Alimentari"
        subtitle="Calorie e macro per ogni giorno, con rotazione ON/OFF e calcolo TDEE."
        actions={<NewPlanForm clients={clientOptions} />}
      />

      {(plans ?? []).length === 0 ? (
        <EmptyState
          emoji="🍽️"
          title="Nessun piano alimentare"
          description="Crea il primo piano: imposti calorie e macro per ogni giorno della settimana, con giorni di allenamento e riposo differenziati."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans!.map((p) => (
            <Link key={p.id} href={`/nutrizione/${p.id}`}>
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
