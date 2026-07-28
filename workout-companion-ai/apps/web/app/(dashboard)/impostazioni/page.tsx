import { createClient } from '@/lib/supabase/server';
import { Badge, Card, PageHeader } from '@/components/ui';
import { ProfileForm } from './profile-form';

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;

  if (demo === '1') {
    return (
      <div>
        <PageHeader
          title="Impostazioni"
          subtitle="Profilo coach e preferenze account compilate per la demo."
          actions={<Badge color="accent">Demo</Badge>}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <h3 className="font-semibold mb-4">Profilo coach</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-text-secondary">Nome</dt><dd>Luca</dd></div>
              <div className="flex justify-between"><dt className="text-text-secondary">Cognome</dt><dd>Coach Pro</dd></div>
              <div className="flex justify-between"><dt className="text-text-secondary">Email</dt><dd>coach.demo@example.com</dd></div>
              <div className="flex justify-between"><dt className="text-text-secondary">Ruolo</dt><dd>Coach</dd></div>
            </dl>
          </Card>
          <Card className="lg:col-span-2">
            <h3 className="font-semibold mb-4">Preferenze operative</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {[
                ['Notifiche check-in', 'Attive'],
                ['Report AI settimanali', 'Attivi'],
                ['Lingua', 'Italiano'],
                ['Valuta listino', 'EUR'],
                ['Promemoria clienti a rischio', 'Ogni mattina'],
                ['Tema dashboard', 'Control room'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border bg-background/60 p-4">
                  <p className="text-text-secondary">{label}</p>
                  <p className="mt-1 font-bold text-white">{value}</p>
                </div>
              ))}
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, sex, date_of_birth, height_cm')
    .eq('id', user!.id)
    .single();

  return (
    <div>
      <PageHeader title="Impostazioni" subtitle="Il tuo profilo e le preferenze dell'account." />
      <ProfileForm
        initial={{
          first_name: profile?.first_name ?? '',
          last_name: profile?.last_name ?? '',
          sex: profile?.sex ?? '',
          date_of_birth: profile?.date_of_birth ?? '',
          height_cm: profile?.height_cm ?? null,
        }}
        email={user!.email ?? ''}
      />
    </div>
  );
}
