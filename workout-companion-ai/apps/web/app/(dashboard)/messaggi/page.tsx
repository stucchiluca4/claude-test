import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState } from '@/components/ui';
import { fullName } from '@/lib/utils';
import { ChatPanel } from './chat-panel';

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Clienti attivi del coach, con eventuale conversazione già esistente
  const { data: clients } = await supabase
    .from('coach_clients')
    .select(
      `id, client:profiles!coach_clients_client_id_fkey(id, first_name, last_name),
       conversations (id)`
    )
    .eq('coach_id', user!.id)
    .eq('status', 'active');

  const contacts = (clients ?? [])
    .filter((c) => c.client)
    .map((c) => ({
      coachClientId: c.id,
      conversationId: (c.conversations as any)?.[0]?.id ?? (c.conversations as any)?.id ?? null,
      name: fullName(c.client as any),
    }));

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      <PageHeader title="Messaggi" subtitle="Chat in tempo reale con i tuoi clienti." />
      {contacts.length === 0 ? (
        <EmptyState
          emoji="💬"
          title="Nessuna chat disponibile"
          description="Le chat compaiono quando hai clienti attivi. Invita un cliente dalla sezione Clienti."
        />
      ) : (
        <ChatPanel contacts={contacts} myId={user!.id} />
      )}
    </div>
  );
}
