import Link from 'next/link';
import { ArrowUpRight, Check, CheckCheck, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState, Card, Badge, buttonSecondary } from '@/components/ui';
import { Reveal } from '@/components/motion';
import { cn, fullName } from '@/lib/utils';
import { ChatPanel } from './chat-panel';

const DEMO_CONTACTS = [
  { coachClientId: 'demo-marco', conversationId: 'demo-conv-marco', name: 'Marco Bellini', last: 'Workout chiuso: panca 4x6 @RPE 8.5', unread: 2 },
  { coachClientId: 'demo-giulia', conversationId: 'demo-conv-giulia', name: 'Giulia Rinaldi', last: 'Check foto caricato, energia 7/10', unread: 1 },
  { coachClientId: 'demo-andrea', conversationId: 'demo-conv-andrea', name: 'Andrea Costa', last: 'Sonno basso, propongo scarico gambe', unread: 0 },
];

const DEMO_THREAD: { mine: boolean; body: string; time: string; read?: boolean }[] = [
  { mine: false, body: 'Coach, panca salita bene ma ultima serie pesante.', time: '18:42' },
  { mine: true, body: 'Perfetto. Teniamo il carico e riduciamo una serie accessoria spalle.', time: '18:47', read: true },
  { mine: false, body: 'Ok, segno RPE 8.5 e carico il video del top set.', time: '18:51' },
  { mine: true, body: 'Ottimo. Domani gambe leggere: qualità prima del carico.', time: '18:53', read: false },
];

/** Iniziali dell'atleta: si riconosce la conversazione prima di leggerne il nome. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** L'altezza della colonna chat: la conversazione riempie lo schermo, la pagina non scorre. */
const SHELL = 'flex h-[calc(100vh-8.5rem)] min-h-[520px] flex-col lg:h-[calc(100vh-4.5rem)]';

/**
 * Le primitive condivise (PageHeader, EmptyState) portano una `.rise` che parte
 * al montaggio: dentro un Reveal il tempo lo detta l'ingresso nel campo visivo.
 */
const NO_RISE = '[&_.rise]:!animate-none';

/** Passo della cascata: prima la testata, poi la conversazione. */
const STEP = 70;

/**
 * La chat è alta quanto lo schermo: con la soglia normale non entrerebbe mai
 * del tutto nel campo visivo, e resterebbe invisibile.
 */
const TALL = 0.02;

/** La colonna chat prende il posto della fascia nel flusso a colonna dello shell. */
const SHELL_BAND = 'flex min-h-0 flex-1 flex-col';

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;

  if (demo === '1') {
    return (
      <div className={SHELL}>
        {/* ---------- Testata: entra per prima ---------- */}
        <Reveal className={NO_RISE}>
          <PageHeader
            title="Messaggi"
            subtitle="Stessa sezione chat, compilata con conversazioni demo."
            actions={
              <>
                <Badge color="accent">Demo</Badge>
                <Link href="/messaggi" className={cn(buttonSecondary, 'min-h-[44px]')}>
                  Torna ai dati reali
                </Link>
              </>
            }
          />
        </Reveal>

        {/* ---------- La conversazione: entra una volta sola, tutta insieme ---------- */}
        <Reveal delay={STEP} amount={TALL} className={SHELL_BAND}>
          <div className="flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-4">
            {/* Elenco conversazioni — FERRO */}
            <Card className="hidden min-h-0 flex-col overflow-hidden p-0 lg:flex">
              <h2 className="px-5 pb-3 pt-5 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                Conversazioni
              </h2>
              <ul className="min-h-0 flex-1 overflow-y-auto pb-3">
                {DEMO_CONTACTS.map((contact, i) => (
                  <li key={contact.coachClientId}>
                    <div
                      className={cn(
                        'flex min-h-[64px] items-center gap-3 border-l-2 px-4 py-3',
                        i === 0 ? 'border-accent bg-raised' : 'border-transparent'
                      )}
                    >
                      <span
                        className={cn(
                          'grid h-10 w-10 shrink-0 place-items-center rounded-full text-[14px] font-bold',
                          i === 0 ? 'bg-accent text-white' : 'bg-raised text-text-secondary'
                        )}
                        aria-hidden
                      >
                        {initialsOf(contact.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={cn(
                              'truncate text-[15px]',
                              i === 0 ? 'font-bold text-white' : 'font-semibold text-text-secondary'
                            )}
                          >
                            {contact.name}
                          </p>
                          {contact.unread > 0 && (
                            <Badge color="accent">{contact.unread} da leggere</Badge>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-text-secondary">{contact.last}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Pastiglie sotto i 1024px */}
            <div className="flex shrink-0 gap-2 overflow-x-auto pb-1 lg:hidden" role="group" aria-label="Conversazioni">
              {DEMO_CONTACTS.map((contact, i) => (
                <span
                  key={contact.coachClientId}
                  className={cn(
                    'inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 text-[14px]',
                    i === 0 ? 'bg-accent font-bold text-white' : 'bg-raised font-semibold text-text-secondary'
                  )}
                >
                  <span
                    className={cn(
                      'grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold',
                      i === 0 ? 'bg-white/20 text-white' : 'bg-card text-text-secondary'
                    )}
                    aria-hidden
                  >
                    {initialsOf(contact.name)}
                  </span>
                  {contact.name}
                </span>
              ))}
            </div>

            {/* La conversazione */}
            <Card className="relative min-h-0 flex-1 overflow-hidden p-0">
              {/* `!absolute`: .glass-chrome è dichiarata dopo le utility e riporterebbe
                  altrimenti la posizione a relative. */}
              <div className="glass-chrome !absolute inset-x-3 top-3 z-20 flex items-center gap-3 rounded-2xl px-4 py-3">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-[14px] font-bold text-white"
                  aria-hidden
                >
                  {initialsOf(DEMO_CONTACTS[0].name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[17px] font-bold text-white">{DEMO_CONTACTS[0].name}</p>
                  <p className="truncate text-[12px] font-medium text-text-secondary">
                    Risponde dall&apos;app Workout Companion
                  </p>
                </div>
              </div>

              <div className="h-full overflow-y-auto px-4 pb-32 pt-24 sm:px-6">
                <div className="mx-auto flex max-w-3xl flex-col gap-2.5">
                  <div className="flex justify-center py-2">
                    <span className="rounded-full bg-raised px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                      Oggi
                    </span>
                  </div>
                  {DEMO_THREAD.map((m) => (
                    <div key={m.body} className={cn('flex', m.mine ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[82%] px-4 py-2.5 sm:max-w-[68%]',
                          m.mine
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
                            m.mine ? 'text-white/70' : 'text-text-secondary'
                          )}
                        >
                          {m.time}
                          {m.mine &&
                            (m.read ? (
                              <CheckCheck size={13} aria-label="Letto" />
                            ) : (
                              <Check size={13} aria-label="Inviato" />
                            ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Barra di scrittura: in demo è solo l'anteprima del comando */}
              <div className="glass-chrome !absolute inset-x-3 bottom-3 z-20 rounded-2xl p-2.5" aria-hidden>
                <div className="flex items-center gap-2">
                  <div className="flex min-h-[48px] flex-1 items-center rounded-sm bg-raised px-4 text-[15px] text-text-tertiary">
                    Scrivi un messaggio…
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent/45 text-white">
                    <Send size={18} />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </Reveal>
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
    <div className={SHELL}>
      {/* ---------- Testata: entra per prima ---------- */}
      <Reveal className={NO_RISE}>
        <PageHeader
          title="Messaggi"
          subtitle="Chat in tempo reale con i tuoi clienti: la parte del lavoro che tiene le persone dentro."
          actions={
            <Link href="/messaggi?demo=1" className={cn(buttonSecondary, 'min-h-[44px]')}>
              Vedi con dati demo
              <ArrowUpRight size={16} aria-hidden />
            </Link>
          }
        />
      </Reveal>
      {contacts.length === 0 ? (
        <Reveal delay={STEP} className={NO_RISE}>
          <EmptyState
            emoji="💬"
            title="Nessuna chat disponibile"
            description="Le chat compaiono quando hai clienti attivi. Invita un cliente dalla sezione Clienti: da lì in poi vi scrivete da qui, in tempo reale."
            action={
              <Link href="/clienti" className={cn(buttonSecondary, 'min-h-[44px]')}>
                Vai ai clienti
                <ArrowUpRight size={16} aria-hidden />
              </Link>
            }
          />
        </Reveal>
      ) : (
        /* ---------- La conversazione: entra una volta sola, tutta insieme ---------- */
        <Reveal delay={STEP} amount={TALL} className={SHELL_BAND}>
          <ChatPanel contacts={contacts} myId={user!.id} />
        </Reveal>
      )}
    </div>
  );
}
