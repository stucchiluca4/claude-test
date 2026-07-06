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

export default async function ClientsPage() {
  const supabase = createClient();
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

  return (
    <div>
      <PageHeader
        title="Clienti"
        subtitle="Gestisci i tuoi atleti: profili, programmi e progressi."
        actions={<InviteClientForm />}
      />

      {(clients ?? []).length === 0 ? (
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
              {clients!.map((c) => {
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
                      <Link href={`/clienti/${c.id}`} className="text-accent hover:underline">
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
