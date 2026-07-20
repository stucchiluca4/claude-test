import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui';
import { ProfileForm } from './profile-form';

export default async function SettingsPage() {
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
