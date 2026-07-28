import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState, Card, Badge } from '@/components/ui';
import { fullName } from '@/lib/utils';
import { ChatPanel } from './chat-panel';

const DEMO_CONTACTS = [
  { coachClientId: 'demo-marco', conversationId: 'demo-conv-marco', name: 'Marco Bellini', last: 'Workout chiuso: panca 4x6 @RPE 8.5', unread: 2 },
  { coachClientId: 'demo-giulia', conversationId: 'demo-conv-giulia', name: 'Giulia Rinaldi', last: 'Check foto caricato, energia 7/10', unread: 1 },
  { coachClientId: 'demo-andrea', conversationId: 'demo-conv-andrea', name: 'Andrea Costa', last: 'Sonno basso, propongo scarico gambe', unread: 0 },
];

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  if (demo === '1') {
    return (
      <div className="h-[calc(100vh-6rem)] flex flex-col">
        <PageHeader title="Messaggi" subtitle="Stessa sezione chat, compilata con conversazioni demo." actions={<Badge color="accent">Demo</Badge>} />
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 min-h-0 flex-1">
          <Card className="p-0 overflow-hidden">
            {DEMO_CONTACTS.map((contact) => (
              <div key={contact.coachClientId} className="border-b border-border px-5 py-4 last:border-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{contact.name}</p>
                  {contact.unread > 0 && <Badge color="accent">{contact.unread}</Badge>}
                </div>
                <p className="text-sm text-text-secondary mt-1">{contact.last}</p>
              </div>
            ))}
          </Card>
          <Card className="flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-text-secondary font-bold">Marco Bellini</p>
              <h3 className="text-xl font-bold mt-2">Feedback allenamento</h3>
              <div className="mt-6 space-y-3 text-sm">
                <p className="rounded-xl bg-background p-3">Coach, panca salita bene ma ultima serie pesante.</p>
                <p className="ml-auto max-w-md rounded-xl bg-accent-deep p-3 text-white">Perfetto. Teniamo il carico e riduciamo una serie accessoria spalle.</p>
                <p className="rounded-xl bg-background p-3">Ok, segno RPE 8.5 e carico video del top set.</p>
              </div>
            </div>
            <div className="mt-6 rounded-lg border border-border bg-background px-4 py-3 text-sm text-text-secondary">
              Scrivi un messaggio demo...
            </div>
          </Card>
        </div>
      </div>
    );
  }

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
