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
  const bottomRef = useRef<HTMLDivElement>(null);

  // Al cambio contatto: assicura che la conversazione esista, poi carica i messaggi
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;

    async function init() {
      let convId = selected!.conversationId;
      if (!convId) {
        // Crea la conversazione al primo messaggio del coach
        const { data } = await supabase
          .from('conversations')
          .upsert(
            { coach_client_id: selected!.coachClientId },
            { onConflict: 'coach_client_id' }
          )
          .select('id')
          .single();
        convId = data?.id ?? null;
      }
      if (cancelled) return;
      setConversationId(convId);
      if (!convId) return;

      const { data: msgs } = await supabase
        .from('messages')
        .select('id, sender_id, body, created_at')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (!cancelled) setMessages(msgs ?? []);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: nuovi messaggi in arrivo
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === (payload.new as Msg).id)
              ? prev
              : [...prev, payload.new as Msg]
          );
        }
      )
      .subscribe();
    return () => {
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
    setText('');

    const { data } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: myId, body })
      .select('id, sender_id, body, created_at')
      .single();
    if (data) {
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    }
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
                  m.sender_id === myId ? 'bg-accent text-white' : 'bg-card border border-border'
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
