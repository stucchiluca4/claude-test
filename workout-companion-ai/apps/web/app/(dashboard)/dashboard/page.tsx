import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, KpiCard, PageHeader, Badge, EmptyState, buttonPrimary } from '@/components/ui';
import { fullName, formatDate } from '@/lib/utils';

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Conteggi clienti
  const { count: totalClients } = await supabase
    .from('coach_clients')
    .select('*', { count: 'exact', head: true })
    .eq('coach_id', user!.id);

  const { count: activeClients } = await supabase
    .from('coach_clients')
    .select('*', { count: 'exact', head: true })
    .eq('coach_id', user!.id)
    .eq('status', 'active');

  // Clienti attivi con profilo, per la lista "a rischio"
  const { data: clients } = await supabase
    .from('coach_clients')
    .select('id, status, started_at, client:profiles!coach_clients_client_id_fkey(id, first_name, last_name)')
    .eq('coach_id', user!.id)
    .eq('status', 'active');

  // Check-in inviati e in attesa di revisione
  const { data: pendingCheckins } = await supabase
    .from('checkins')
    .select('id, week_start, coach_client_id, submitted_at')
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })
    .limit(6);

  // "A rischio" (v1 semplice): nessun allenamento registrato negli ultimi 7 giorni
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const clientIds = (clients ?? [])
    .map((c) => (c.client as any)?.id)
    .filter(Boolean) as string[];

  let recentlyActiveIds = new Set<string>();
  if (clientIds.length > 0) {
    const { data: recentLogs } = await supabase
      .from('workout_logs')
      .select('client_id')
      .in('client_id', clientIds)
      .gte('started_at', weekAgo);
    recentlyActiveIds = new Set((recentLogs ?? []).map((l) => l.client_id));
  }
  const atRisk = (clients ?? []).filter(
    (c) => (c.client as any)?.id && !recentlyActiveIds.has((c.client as any).id)
  );

  const hasClients = (totalClients ?? 0) > 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="La panoramica del tuo business, a colpo d'occhio."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Clienti totali" value={String(totalClients ?? 0)} />
        <KpiCard label="Clienti attivi" value={String(activeClients ?? 0)} />
        <KpiCard
          label="A rischio abbandono"
          value={String(atRisk.length)}
          delta={atRisk.length > 0 ? 'da ricontattare' : 'tutto ok ✓'}
          deltaGood={atRisk.length === 0}
        />
        <KpiCard label="Check-in da rivedere" value={String(pendingCheckins?.length ?? 0)} />
      </div>

      {!hasClients ? (
        <EmptyState
          emoji="🚀"
          title="Inizia invitando il tuo primo cliente"
          description="Aggiungi un cliente per creare programmi di allenamento, piani alimentari e ricevere i suoi check-in."
          action={
            <Link href="/clienti" className={buttonPrimary}>
              + Aggiungi cliente
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              ⚠️ Clienti a rischio
              <span className="text-xs text-text-secondary font-normal">
                (nessun allenamento negli ultimi 7 giorni)
              </span>
            </h3>
            {atRisk.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Nessun cliente a rischio. Ottimo lavoro! 💪
              </p>
            ) : (
              <ul className="space-y-3">
                {atRisk.map((c) => (
                  <li key={c.id} className="flex items-center justify-between">
                    <span className="text-sm">{fullName(c.client as any)}</span>
                    <Link
                      href="/messaggi"
                      className="text-xs text-accent hover:underline"
                    >
                      Scrivi →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h3 className="font-semibold mb-4">📋 Check-in da rivedere</h3>
            {(pendingCheckins ?? []).length === 0 ? (
              <p className="text-sm text-text-secondary">Nessun check-in in attesa.</p>
            ) : (
              <ul className="space-y-3">
                {pendingCheckins!.map((ci) => (
                  <li key={ci.id} className="flex items-center justify-between">
                    <span className="text-sm">
                      Settimana del {formatDate(ci.week_start)}
                      <Badge color="warning"> nuovo</Badge>
                    </span>
                    <Link href={`/checkin/${ci.id}`} className="text-xs text-accent hover:underline">
                      Rivedi →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
