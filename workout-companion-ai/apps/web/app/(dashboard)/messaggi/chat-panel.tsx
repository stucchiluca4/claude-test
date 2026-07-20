'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { inputClass, buttonPrimary } from '@/components/ui';
import { Send } from 'lucide-react';

interface Contact {
  coachClientId: string;
  conversationId: string | null;
  name: string;
}

interface Msg {
  id: string;
  sender_id: string;
  body: string | null;
  created_at: string;
}

export function ChatPanel({ contacts, myId }: { contacts: Contact[]; myId: string }) {
  const supabase = createClient();
  const [selected, setSelected] = useState<Contact | null>(contacts[0] ?? null);
  const [conversationId, setConversationId] = useState<string | null>(
    contacts[0]?.conversationId ?? null
  );
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Segna come letti i messaggi ricevuti dall'altro partecipante (KPI "Messaggi da leggere")
  async function markAsRead(convId: string) {
    await supabase
      .from('messages')
      .update({ status: 'read' })
      .eq('conversation_id', convId)
      .neq('sender_id', myId)
      .neq('status', 'read');
  }

  // Al cambio contatto: assicura che la conversazione esista
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setError(null);

    async function init() {
      let convId = selected!.conversationId;
      if (!convId) {
        // Crea la conversazione al primo messaggio del coach
        const { data, error: convError } = await supabase
          .from('conversations')
          .upsert(
            { coach_client_id: selected!.coachClientId },
            { onConflict: 'coach_client_id' }
          )
          .select('id')
          .single();
        if (convError) {
          if (!cancelled) {
            setConversationId(null);
            setError('Impossibile aprire la conversazione. Riprova.');
          }
          return;
        }
        convId = data?.id ?? null;
      }
      if (!cancelled) setConversationId(convId);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: sottoscrivi prima e carica lo storico dopo, così i messaggi
  // arrivati nel frattempo non si perdono (deduplica per id)
  useEffect(() => {
    if (!conversationId) return;
    const convId = conversationId;
    let cancelled = false;
    const channel = supabase
      .channel(`chat-${convId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          const msg = payload.new as Msg;
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
          );
          // Conversazione aperta: il messaggio ricevuto è subito letto
          if (msg.sender_id !== myId) markAsRead(convId);
        }
      )
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return;
        const { data: msgs } = await supabase
          .from('messages')
          .select('id, sender_id, body, created_at')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true })
          .limit(200);
        if (cancelled || !msgs) return;
        setMessages((prev) => [
          ...msgs,
          ...prev.filter((p) => !msgs.some((m) => m.id === p.id)),
        ]);
        markAsRead(convId);
      });
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !conversationId) return;
    const body = text.trim();

    const { data, error: sendError } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: myId, body })
      .select('id, sender_id, body, created_at')
      .single();
    if (sendError || !data) {
      // Mantieni il testo nell'input per permettere di riprovare
      setError('Invio non riuscito. Riprova.');
      return;
    }
    // Svuota l'input solo a invio riuscito
    setError(null);
    setText('');
    setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);
  }

  return (
    <div className="flex-1 flex border border-border rounded-xl overflow-hidden min-h-0">
      {/* Lista contatti */}
      <div className="w-64 border-r border-border overflow-y-auto shrink-0">
        {contacts.map((c) => (
          <button
            key={c.coachClientId}
            onClick={() => {
              setSelected(c);
              setMessages([]);
            }}
            className={cn(
              'w-full text-left px-4 py-3.5 border-b border-border text-sm transition',
              selected?.coachClientId === c.coachClientId
                ? 'bg-card font-medium'
                : 'hover:bg-card/50 text-text-secondary'
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Conversazione */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-5 py-3.5 border-b border-border font-medium text-sm">
          {selected?.name}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-text-secondary text-center mt-8">
              Nessun messaggio ancora. Scrivi il primo! 👇
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn('flex', m.sender_id === myId ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[70%] rounded-2xl px-4 py-2.5 text-sm',
                  m.sender_id === myId ? 'grad-primary text-white' : 'glass'
                )}
              >
                {m.body}
                <div
                  className={cn(
                    'text-[10px] mt-1',
                    m.sender_id === myId ? 'text-white/70' : 'text-text-secondary'
                  )}
                >
                  {new Date(m.created_at).toLocaleTimeString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {error && <p className="text-danger text-sm px-5 pb-2">{error}</p>}

        <form onSubmit={send} className="p-4 border-t border-border flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={inputClass}
            placeholder="Scrivi un messaggio…"
          />
          <button type="submit" className={buttonPrimary + ' !px-3.5'} disabled={!text.trim()}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
