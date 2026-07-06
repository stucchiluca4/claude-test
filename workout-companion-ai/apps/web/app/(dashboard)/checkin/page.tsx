import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState } from '@/components/ui';
import { fullName, formatDate, formatKg } from '@/lib/utils';

export default async function CheckinsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: checkins } = await supabase
    .from('checkins')
    .select(
      `id, week_start, status, weight_kg, submitted_at,
       coach_client:coach_clients!inner(coach_id, client:profiles!coach_clients_client_id_fkey(first_name, last_name))`
    )
    .eq('coach_client.coach_id', user!.id)
    .order('week_start', { ascending: false })
    .limit(50);

  return (
    <div>
      <PageHeader
        title="Check & Progressi"
        subtitle="I check-in settimanali dei tuoi clienti, da rivedere e commentare."
      />

      {(checkins ?? []).length === 0 ? (
        <EmptyState
          emoji="📸"
          title="Nessun check-in ricevuto"
          description="Quando i tuoi clienti invieranno il check-in settimanale dall'app (peso, foto, sonno, energia, aderenza) lo troverai qui."
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-secondary border-b border-border">
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Settimana</th>
                <th className="px-5 py-3 font-medium">Peso</th>
                <th className="px-5 py-3 font-medium">Stato</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {checkins!.map((ci) => (
                <tr key={ci.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                  <td className="px-5 py-3.5">
                    {fullName((ci.coach_client as any)?.client ?? null)}
                  </td>
                  <td className="px-5 py-3.5 text-text-secondary">{formatDate(ci.week_start)}</td>
                  <td className="px-5 py-3.5">{formatKg(ci.weight_kg)}</td>
                  <td className="px-5 py-3.5">
                    <Badge
                      color={
                        ci.status === 'reviewed'
                          ? 'success'
                          : ci.status === 'submitted'
                            ? 'warning'
                            : 'default'
                      }
                    >
                      {ci.status === 'reviewed'
                        ? 'Rivisto'
                        : ci.status === 'submitted'
                          ? 'Da rivedere'
                          : 'In attesa'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link href={`/checkin/${ci.id}`} className="text-accent hover:underline">
                      Apri →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
