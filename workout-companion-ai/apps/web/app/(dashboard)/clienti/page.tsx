import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState } from '@/components/ui';
import { fullName, formatDate } from '@/lib/utils';
import { InviteClientForm } from './invite-form';

const STATUS_LABEL: Record<string, { label: string; color: 'success' | 'warning' | 'default' | 'danger' }> = {
  active: { label: 'Attivo', color: 'success' },
  invited: { label: 'Invitato', color: 'warning' },
  paused: { label: 'In pausa', color: 'default' },
  ended: { label: 'Concluso', color: 'danger' },
};

const DEMO_CLIENTS = [
  { id: 'demo-marco', status: 'active', invite_email: null, started_at: '2026-05-04', client: { first_name: 'Marco', last_name: 'Bellini', avatar_url: null } },
  { id: 'demo-giulia', status: 'active', invite_email: null, started_at: '2026-04-15', client: { first_name: 'Giulia', last_name: 'Rinaldi', avatar_url: null } },
  { id: 'demo-andrea', status: 'paused', invite_email: null, started_at: '2026-03-20', client: { first_name: 'Andrea', last_name: 'Costa', avatar_url: null } },
  { id: 'demo-sofia', status: 'invited', invite_email: 'sofia.demo@example.com', started_at: null, client: null },
];

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  if (demo === '1') {
    return <ClientsTable clients={DEMO_CLIENTS} demo />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: clients } = await supabase
    .from('coach_clients')
    .select(
      'id, status, invite_email, started_at, created_at, client:profiles!coach_clients_client_id_fkey(first_name, last_name, avatar_url)'
    )
    .eq('coach_id', user!.id)
    .order('created_at', { ascending: false });

  return <ClientsTable clients={clients ?? []} />;
}

function ClientsTable({ clients, demo = false }: { clients: any[]; demo?: boolean }) {
  return (
    <div>
      <PageHeader
        title="Clienti"
        subtitle={demo ? 'Stessa sezione clienti, compilata con dati demo.' : 'Gestisci i tuoi atleti: profili, programmi e progressi.'}
        actions={demo ? <Badge color="accent">Demo</Badge> : <InviteClientForm />}
      />

      {clients.length === 0 ? (
        <EmptyState
          emoji="👥"
          title="Nessun cliente ancora"
          description="Invita il tuo primo cliente con il bottone qui sopra: riceverà un invito per scaricare l'app e compilare il questionario iniziale."
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-secondary border-b border-border">
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Stato</th>
                <th className="px-5 py-3 font-medium">Inizio</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const st = STATUS_LABEL[c.status] ?? STATUS_LABEL.ended;
                return (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                    <td className="px-5 py-3.5">
                      {c.client ? fullName(c.client as any) : (c.invite_email ?? 'Invito inviato')}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge color={st.color}>{st.label}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary">{formatDate(c.started_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={demo ? `/clienti/${c.id}?demo=1` : `/clienti/${c.id}`} className="text-accent hover:underline">
                        Apri scheda →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
