import { createClient } from '@/lib/supabase/server';
import { Badge, Card, PageHeader } from '@/components/ui';
import { Reveal } from '@/components/motion';
import { ProfileForm } from './profile-form';

/** Etichetta di sezione: 12px, maiuscoletto, spaziata. */
const sectionLabel = 'text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary';

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;

  if (demo === '1') {
    return (
      <div>
        <PageHeader
          title="Impostazioni"
          subtitle="Profilo coach e preferenze account, già compilati per la demo."
          actions={<Badge color="accent">Dati demo</Badge>}
        />
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
          {/* Fascia 1 — chi sei */}
          <Reveal className="block">
            <Card>
              <p className={sectionLabel}>Profilo coach</p>
              <div className="mt-4 flex items-center gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-md bg-raised text-[22px] font-bold text-white">
                  LC
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[17px] font-bold text-white">Luca Coach Pro</p>
                  <p className="truncate text-[13px] text-text-secondary">coach.demo@example.com</p>
                </div>
              </div>
              <dl className="mt-5 divide-y divide-line/70 text-[15px]">
                {[
                  ['Nome', 'Luca'],
                  ['Cognome', 'Coach Pro'],
                  ['Ruolo', 'Coach'],
                ].map(([label, value]) => (
                  <div key={label} className="flex min-h-[48px] items-center justify-between gap-4 py-3">
                    <dt className="text-text-secondary">{label}</dt>
                    <dd className="text-right font-semibold text-white">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </Reveal>

          {/* Fascia 2 — come lavori: entra subito dopo, non insieme */}
          <Reveal className="block lg:col-span-2" delay={70}>
            <Card>
              <p className={sectionLabel}>Preferenze operative</p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  ['Notifiche check-in', 'Attive'],
                  ['Report AI settimanali', 'Attivi'],
                  ['Lingua', 'Italiano'],
                  ['Valuta listino', 'EUR'],
                  ['Promemoria clienti a rischio', 'Ogni mattina'],
                  ['Tema dashboard', 'Control room'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md bg-raised p-4">
                    <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                      {label}
                    </p>
                    <p className="mt-2 text-[17px] font-bold text-white">{value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>
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
      <PageHeader
        title="Impostazioni"
        subtitle="Il tuo profilo e le preferenze dell'account. I dati compaiono nei report che invii ai clienti."
      />
      {/* Fascia unica e alta: soglia d'ingresso bassa, così entra comunque. */}
      <Reveal amount={0.05}>
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
      </Reveal>
    </div>
  );
}
