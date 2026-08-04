import Link from 'next/link';
import { UserRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState } from '@/components/ui';
import { fullName } from '@/lib/utils';
import { NewPlanForm } from './new-plan-form';

const DEMO_PLANS = [
  { id: 'demo-lean-bulk', name: 'Lean Bulk 2740 kcal', status: 'active', duration_weeks: 8, tdee_kcal: 2860, target_kcal: 2740, coach_client: { client: { first_name: 'Marco', last_name: 'Bellini' } } },
  { id: 'demo-recomp', name: 'Ricomp 2100 kcal ON/OFF', status: 'active', duration_weeks: 12, tdee_kcal: 2320, target_kcal: 2100, coach_client: { client: { first_name: 'Giulia', last_name: 'Rinaldi' } } },
  { id: 'demo-cut', name: 'Cut sostenibile 1900 kcal', status: 'draft', duration_weeks: 6, tdee_kcal: 2480, target_kcal: 1900, coach_client: { client: { first_name: 'Andrea', last_name: 'Costa' } } },
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
        'id, name, status, duration_weeks, tdee_kcal, target_kcal, coach_client:coach_clients(client:profiles!coach_clients_client_id_fkey(first_name, last_name))'
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
          {plans.map((p, i) => {
            const kcal = p.target_kcal ?? p.tdee_kcal;
            const kcalLabel = p.target_kcal != null ? 'obiettivo giornaliero' : 'TDEE stimato';
            return (
              <Link
                key={p.id}
                href={demo ? `/nutrizione/${p.id}?demo=1` : `/nutrizione/${p.id}`}
                className={`block h-full rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent/60 rise rise-${(i % 5) + 1}`}
              >
                <Card className="h-full cursor-pointer transition duration-200 hover:bg-card-hover hover:border-accent/30 hover:-translate-y-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold leading-snug">{p.name}</h3>
                    <Badge color={p.status === 'active' ? 'success' : 'default'}>
                      {p.status === 'active' ? 'Attivo' : 'Bozza'}
                    </Badge>
                  </div>

                  {kcal != null ? (
                    <div className="mt-4">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-extrabold text-white tabular-nums">
                          {kcal.toLocaleString('it-IT')}
                        </span>
                        <span className="text-sm text-text-secondary">kcal/die</span>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5">{kcalLabel}</p>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-text-secondary">Macro da definire</p>
                  )}

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-1.5 text-text-secondary min-w-0">
                      <UserRound size={14} className="shrink-0" />
                      <span className="truncate">
                        {(p.coach_client as any)?.client
                          ? fullName((p.coach_client as any).client)
                          : '—'}
                      </span>
                    </span>
                    <span className="text-text-secondary tabular-nums shrink-0">
                      {p.duration_weeks} sett.
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
