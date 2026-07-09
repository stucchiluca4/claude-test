import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, PageHeader, Badge, EmptyState, buttonPrimary } from '@/components/ui';
import { Sparkline } from '@/components/sparkline';
import { fullName, formatDate } from '@/lib/utils';
import { QuickNotes } from './quick-notes';
import {
  Dumbbell,
  Utensils,
  MessageSquare,
  ClipboardCheck,
  UserPlus,
  Tag,
} from 'lucide-react';

const QUICK_ACTIONS = [
  { href: '/allenamenti', label: 'Crea programma', icon: Dumbbell },
  { href: '/nutrizione', label: 'Crea piano alimentare', icon: Utensils },
  { href: '/messaggi', label: 'Invia messaggio', icon: MessageSquare },
  { href: '/checkin', label: 'Valuta check', icon: ClipboardCheck },
  { href: '/clienti', label: 'Nuovo cliente', icon: UserPlus },
  { href: '/listino', label: 'Gestisci listino', icon: Tag },
];

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: profile },
    { data: clients },
    { data: activePrograms },
    { data: pendingCheckins },
    { count: unreadMessages },
    { data: recentLogs },
    { data: monthCheckins },
    { data: note },
  ] = await Promise.all([
    supabase.from('profiles').select('first_name').eq('id', user!.id).single(),
    supabase
      .from('coach_clients')
      .select(
        'id, status, created_at, started_at, client:profiles!coach_clients_client_id_fkey(id, first_name, last_name)'
      )
      .eq('coach_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('programs')
      .select(
        'id, name, start_date, duration_weeks, coach_client:coach_clients!inner(coach_id, client:profiles!coach_clients_client_id_fkey(first_name, last_name))'
      )
      .eq('coach_client.coach_id', user!.id)
      .eq('status', 'active')
      .not('start_date', 'is', null),
    supabase
      .from('checkins')
      .select(
        'id, week_start, submitted_at, coach_client:coach_clients!inner(coach_id, client:profiles!coach_clients_client_id_fkey(first_name, last_name))'
      )
      .eq('coach_client.coach_id', user!.id)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .limit(6),
    supabase
      .from('messages')
      .select('id, conversation:conversations!inner(coach_client:coach_clients!inner(coach_id))', {
        count: 'exact',
        head: true,
      })
      .eq('conversation.coach_client.coach_id', user!.id)
      .neq('sender_id', user!.id)
      .neq('status', 'read'),
    supabase
      .from('workout_logs')
      .select('client_id, started_at, completed_at')
      .gte('started_at', new Date(Date.now() - 56 * 24 * 3600 * 1000).toISOString())
      .order('started_at', { ascending: false }),
    supabase
      .from('checkins')
      .select('id, coach_client:coach_clients!inner(coach_id)')
      .eq('coach_client.coach_id', user!.id)
      .in('status', ['submitted', 'reviewed'])
      .gte('week_start', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)),
    supabase.from('quick_notes').select('body').eq('coach_id', user!.id).maybeSingle(),
  ]);

  const allClients = clients ?? [];
  const activeClients = allClients.filter((c) => c.status === 'active');
  const invitedClients = allClients.filter((c) => c.status === 'invited');
  const endedClients = allClients.filter((c) => c.status === 'ended');

  // Solo i log dei MIEI clienti (la query RLS restituisce già solo quelli visibili)
  const clientIds = new Set(activeClients.map((c) => (c.client as any)?.id).filter(Boolean));
  const myLogs = (recentLogs ?? []).filter((l) => clientIds.has(l.client_id));

  // Programmi in scadenza nei prossimi 7 giorni
  const today = Date.now();
  const expiring = (activePrograms ?? [])
    .map((p) => {
      const end = new Date(p.start_date!).getTime() + p.duration_weeks * 7 * 24 * 3600 * 1000;
      return { ...p, daysLeft: Math.ceil((end - today) / (24 * 3600 * 1000)) };
    })
    .filter((p) => p.daysLeft >= 0 && p.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // Clienti a rischio: attivi senza allenamenti negli ultimi 7 giorni
  const weekAgo = today - 7 * 24 * 3600 * 1000;
  const activeLastWeek = new Set(
    myLogs.filter((l) => new Date(l.started_at).getTime() >= weekAgo).map((l) => l.client_id)
  );
  const atRisk = activeClients.filter(
    (c) => (c.client as any)?.id && !activeLastWeek.has((c.client as any).id)
  );

  // Sparkline: allenamenti completati per settimana (ultime 8)
  const weeklyWorkouts = Array.from({ length: 8 }, (_, i) => {
    const start = today - (8 - i) * 7 * 24 * 3600 * 1000;
    const end = start + 7 * 24 * 3600 * 1000;
    return myLogs.filter((l) => {
      const t = new Date(l.started_at).getTime();
      return t >= start && t < end;
    }).length;
  });

  const retention =
    activeClients.length + endedClients.length > 0
      ? Math.round((activeClients.length / (activeClients.length + endedClients.length)) * 100)
      : null;

  const hasClients = allClients.length > 0;
  const workouts7d = myLogs.filter((l) => new Date(l.started_at).getTime() >= weekAgo).length;

  return (
    <div>
      <PageHeader
        title={`Bentornato${profile?.first_name ? ', ' + profile.first_name : ''} 👋`}
        subtitle="Ecco cosa sta succedendo oggi."
      />

      {/* Riga KPI operativi */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        {(
          [
            ['Nuovi clienti', invitedClients.length, 'Da completare onboarding', '/clienti'],
            ['Programmi in scadenza', expiring.length, 'Nei prossimi 7 giorni', '/allenamenti'],
            ['Messaggi da leggere', unreadMessages ?? 0, 'Non letti', '/messaggi'],
            ['Check da valutare', pendingCheckins?.length ?? 0, 'In attesa di revisione', '/checkin'],
            ['A rischio abbandono', atRisk.length, 'Nessun workout da 7gg', '/clienti'],
          ] as const
        ).map(([label, value, sub, href]) => (
          <Link key={label} href={href}>
            <Card className="hover:bg-card-hover transition h-full">
              <div className="text-sm text-text-secondary">{label}</div>
              <div
                className={`text-3xl font-bold mt-1 ${Number(value) > 0 ? 'text-accent' : ''}`}
              >
                {value}
              </div>
              <div className="text-xs text-text-secondary mt-1">{sub}</div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Panoramica con sparkline */}
      <Card className="mb-4">
        <h3 className="font-semibold text-sm mb-4">Panoramica</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-text-secondary">Clienti attivi</div>
            <div className="text-3xl font-bold mt-1">{activeClients.length}</div>
          </div>
          <div>
            <div className="text-sm text-text-secondary">Allenamenti (7 giorni)</div>
            <div className="text-3xl font-bold mt-1">{workouts7d}</div>
            <Sparkline values={weeklyWorkouts} color="#2563EB" />
          </div>
          <div>
            <div className="text-sm text-text-secondary">Check ricevuti (30 giorni)</div>
            <div className="text-3xl font-bold mt-1">{monthCheckins?.length ?? 0}</div>
          </div>
          <div>
            <div className="text-sm text-text-secondary">Retention</div>
            <div className="text-3xl font-bold mt-1">{retention != null ? `${retention}%` : '—'}</div>
            <div className="text-xs text-text-secondary">clienti attivi vs conclusi</div>
          </div>
        </div>
      </Card>

      {!hasClients ? (
        <EmptyState
          emoji="🚀"
          title="Inizia invitando il tuo primo cliente"
          description="Aggiungi un cliente per creare programmi, piani alimentari e ricevere check-in e biofeedback."
          action={
            <Link href="/clienti" className={buttonPrimary}>
              + Aggiungi cliente
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Clienti recenti */}
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <h3 className="font-semibold text-sm">Clienti recenti</h3>
                <Link href="/clienti" className="text-xs text-accent hover:underline">
                  Vedi tutti
                </Link>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {allClients.slice(0, 5).map((c) => (
                    <tr key={c.id} className="border-t border-border hover:bg-card-hover">
                      <td className="px-5 py-2.5">
                        <Link href={`/clienti/${c.id}`} className="hover:text-accent">
                          {c.client ? fullName(c.client as any) : 'Invito inviato'}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <Badge
                          color={
                            c.status === 'active'
                              ? 'success'
                              : c.status === 'invited'
                                ? 'warning'
                                : 'default'
                          }
                        >
                          {c.status === 'active'
                            ? 'Attivo'
                            : c.status === 'invited'
                              ? 'Invitato'
                              : 'Inattivo'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Programmi in scadenza */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Programmi in scadenza</h3>
                <Link href="/allenamenti" className="text-xs text-accent hover:underline">
                  Vedi tutti
                </Link>
              </div>
              {expiring.length === 0 ? (
                <p className="text-sm text-text-secondary">Nessun programma in scadenza. ✓</p>
              ) : (
                <ul className="space-y-3">
                  {expiring.slice(0, 5).map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <Link href={`/allenamenti/${p.id}`} className="hover:text-accent">
                        {fullName((p.coach_client as any)?.client ?? null)}
                        <span className="block text-xs text-text-secondary">{p.name}</span>
                      </Link>
                      <span
                        className={`text-xs font-medium ${p.daysLeft <= 2 ? 'text-danger' : 'text-warning'}`}
                      >
                        Scade tra {p.daysLeft}g
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Check da valutare */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Check da valutare</h3>
                <Link href="/checkin" className="text-xs text-accent hover:underline">
                  Vedi tutti
                </Link>
              </div>
              {(pendingCheckins ?? []).length === 0 ? (
                <p className="text-sm text-text-secondary">Nessun check in attesa. ✓</p>
              ) : (
                <ul className="space-y-3">
                  {pendingCheckins!.map((ci) => (
                    <li key={ci.id} className="flex items-center justify-between text-sm">
                      <Link href={`/checkin/${ci.id}`} className="hover:text-accent">
                        {fullName((ci.coach_client as any)?.client ?? null)}
                        <span className="block text-xs text-text-secondary">
                          Settimana del {formatDate(ci.week_start)}
                        </span>
                      </Link>
                      <span className="text-xs text-text-secondary">
                        {formatDate(ci.submitted_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Azioni rapide */}
            <Card className="lg:col-span-2">
              <h3 className="font-semibold text-sm mb-4">Azioni rapide</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {QUICK_ACTIONS.map((a) => (
                  <Link
                    key={a.href + a.label}
                    href={a.href}
                    className="flex items-center gap-3 border border-border rounded-xl px-4 py-3 text-sm hover:bg-card-hover hover:border-accent/50 transition"
                  >
                    <a.icon size={18} className="text-accent shrink-0" />
                    {a.label}
                  </Link>
                ))}
              </div>
            </Card>

            {/* Note rapide */}
            <QuickNotes initialBody={note?.body ?? ''} />
          </div>
        </>
      )}
    </div>
  );
}
