import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/sidebar';
import { fullName } from '@/lib/utils';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, role')
    .eq('id', user.id)
    .single();

  // Il portale web è riservato ai coach: gli atleti usano l'app mobile.
  if (profile?.role === 'athlete') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-2">Ciao {fullName(profile)} 👋</h1>
          <p className="text-text-secondary">
            Questo portale è pensato per i <strong>coach</strong>. Come atleta, il tuo
            allenamento, la nutrizione e i check-in si gestiscono dall&apos;app mobile
            Workout Companion.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={fullName(profile)} />
      <main className="flex-1 px-8 py-6 max-w-[1400px]">{children}</main>
    </div>
  );
}
