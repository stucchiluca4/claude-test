import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState } from '@/components/ui';
import { PROGRAM_GOALS } from '@wc/shared';
import { fullName } from '@/lib/utils';
import { NewProgramForm } from './new-program-form';

export default async function ProgramsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: programs }, { data: clients }] = await Promise.all([
    supabase
      .from('programs')
      .select(
        'id, name, goal, status, duration_weeks, coach_client:coach_clients(id, client:profiles!coach_clients_client_id_fkey(first_name, last_name))'
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
        title="Allenamenti & Programmi"
        subtitle="Crea schede multi-settimana con periodizzazione e assegnale ai clienti."
        actions={<NewProgramForm clients={clientOptions} />}
      />

      {(programs ?? []).length === 0 ? (
        <EmptyState
          emoji="🏋️"
          title="Nessun programma ancora"
          description="Crea la tua prima scheda: potrai aggiungere settimane, giornate ed esercizi dalla libreria con serie, ripetizioni, RPE e recuperi."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs!.map((p) => (
            <Link key={p.id} href={`/allenamenti/${p.id}`}>
              <Card className="hover:bg-card-hover transition cursor-pointer h-full">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold">{p.name}</h3>
                  <Badge color={p.status === 'active' ? 'success' : 'default'}>
                    {p.status === 'active' ? 'Attivo' : p.status === 'draft' ? 'Bozza' : p.status}
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary mt-2">
                  {PROGRAM_GOALS[p.goal as keyof typeof PROGRAM_GOALS] ?? p.goal} ·{' '}
                  {p.duration_weeks} settimane
                </p>
                <p className="text-sm mt-3">
                  👤{' '}
                  {(p.coach_client as any)?.client
                    ? fullName((p.coach_client as any).client)
                    : 'Template (nessun cliente)'}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
