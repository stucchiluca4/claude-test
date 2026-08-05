'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Card, inputClass, buttonPrimary } from '@/components/ui';
import { AlertCircle, Check, CheckCheck, MessageSquare, Send } from 'lucide-react';

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
  status?: string | null;
}

/** Iniziali dell'atleta: si riconosce la conversazione prima di leggerne il nome. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Separatore di giornata: oggi, ieri, oppure la data per esteso. */
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return 'Oggi';
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return 'Ieri';
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
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
          .select('id, sender_id, body, created_at, status')
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
      .select('id, sender_id, body, created_at, status')
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

  function openContact(c: Contact) {
    setSelected(c);
    setMessages([]);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-4">
      {/* ---------- Elenco conversazioni (FERRO) ---------- */}
      <Card className="hidden min-h-0 flex-col overflow-hidden p-0 lg:flex">
        <h2 className="px-5 pb-3 pt-5 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
          Conversazioni
        </h2>
        <ul className="min-h-0 flex-1 overflow-y-auto pb-3">
          {contacts.map((c) => {
            const active = selected?.coachClientId === c.coachClientId;
            return (
              <li key={c.coachClientId}>
                <button
                  type="button"
                  onClick={() => openContact(c)}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'press flex min-h-[64px] w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition',
                    active
                      ? 'border-accent bg-raised'
                      : 'border-transparent hover:bg-raised/60'
                  )}
                >
                  <span
                    className={cn(
                      'grid h-10 w-10 shrink-0 place-items-center rounded-full text-[14px] font-bold',
                      active ? 'bg-accent text-white' : 'bg-raised text-text-secondary'
                    )}
                    aria-hidden
                  >
                    {initialsOf(c.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block truncate text-[15px]',
                        active ? 'font-bold text-white' : 'font-semibold text-text-secondary'
                      )}
                    >
                      {c.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-text-secondary">
                      {active ? 'Conversazione aperta' : 'Apri la chat'}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* ---------- Sotto i 1024px: le conversazioni diventano una fila di pastiglie ---------- */}
      <div
        className="flex shrink-0 gap-2 overflow-x-auto pb-1 lg:hidden"
        role="group"
        aria-label="Conversazioni"
      >
        {contacts.map((c) => {
          const active = selected?.coachClientId === c.coachClientId;
          return (
            <button
              key={c.coachClientId}
              type="button"
              onClick={() => openContact(c)}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'press inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 text-[14px] transition',
                active ? 'bg-accent font-bold text-white' : 'bg-raised font-semibold text-text-secondary'
              )}
            >
              <span
                className={cn(
                  'grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold',
                  active ? 'bg-white/20 text-white' : 'bg-card text-text-secondary'
                )}
                aria-hidden
              >
                {initialsOf(c.name)}
              </span>
              {c.name}
            </button>
          );
        })}
      </div>

      {/* ---------- La conversazione: contenuto su FERRO, comandi sul VETRO ---------- */}
      <Card className="relative min-h-0 flex-1 overflow-hidden p-0">
        {/* Testata ancorata: livello vetro, galleggia sui messaggi che scorrono */}
        {/* `!absolute`: .glass-chrome è dichiarata dopo le utility e riporterebbe
            altrimenti la posizione a relative. */}
        <div className="glass-chrome !absolute inset-x-3 top-3 z-20 flex items-center gap-3 rounded-2xl px-4 py-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-[14px] font-bold text-white"
            aria-hidden
          >
            {selected ? initialsOf(selected.name) : '—'}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[17px] font-bold text-white">{selected?.name ?? '—'}</p>
            <p className="truncate text-[12px] font-medium text-text-secondary">
              Risponde dall&apos;app Workout Companion
            </p>
          </div>
        </div>

        {/* Il flusso dei messaggi: ogni bolla è opaca, si legge sempre */}
        <div className="h-full overflow-y-auto px-4 pb-32 pt-24 sm:px-6">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center px-6 text-center">
              <span className="mb-4 grid h-16 w-16 place-items-center rounded-lg bg-raised text-text-secondary">
                <MessageSquare size={26} aria-hidden />
              </span>
              <p className="text-[17px] font-bold text-white">Nessun messaggio</p>
              <p className="mt-1.5 max-w-xs text-[15px] text-text-secondary">
                Apri tu il dialogo: una riga sul check-in della settimana vale più di dieci notifiche.
              </p>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-2.5">
              {messages.map((m, i) => {
                const mine = m.sender_id === myId;
                const prev = messages[i - 1];
                const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
                const read = mine && m.status === 'read';
                return (
                  <Fragment key={m.id}>
                    {newDay && (
                      <div className="flex justify-center py-2">
                        <span className="rounded-full bg-raised px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                          {dayLabel(m.created_at)}
                        </span>
                      </div>
                    )}
                    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[82%] px-4 py-2.5 sm:max-w-[68%]',
                          mine
                            ? 'rounded-lg rounded-br-[8px] bg-accent text-white'
                            : 'rounded-lg rounded-bl-[8px] bg-raised text-white'
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                          {m.body}
                        </p>
                        <div
                          className={cn(
                            'mt-1 flex items-center justify-end gap-1 text-[11px] font-semibold tnum',
                            mine ? 'text-white/70' : 'text-text-secondary'
                          )}
                        >
                          {new Date(m.created_at).toLocaleTimeString('it-IT', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {mine &&
                            (read ? (
                              <CheckCheck size={13} aria-label="Letto" />
                            ) : (
                              <Check size={13} aria-label="Inviato" />
                            ))}
                        </div>
                      </div>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Barra di scrittura ancorata: livello vetro, campo di testo su ferro */}
        <div className="glass-chrome !absolute inset-x-3 bottom-3 z-20 rounded-2xl p-2.5">
          {error && (
            <p
              role="alert"
              className="mb-2 flex items-center gap-1.5 px-1.5 text-[13px] font-semibold text-rose"
            >
              <AlertCircle size={14} aria-hidden />
              {error}
            </p>
          )}
          <form onSubmit={send} className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="Scrivi un messaggio"
              className={cn(inputClass, 'min-h-[48px] flex-1')}
              placeholder="Scrivi un messaggio…"
            />
            <button
              type="submit"
              aria-label="Invia messaggio"
              className={cn(buttonPrimary, 'h-12 w-12 shrink-0 px-0 py-0')}
              disabled={!text.trim() || !conversationId}
            >
              <Send size={18} aria-hidden />
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
}
