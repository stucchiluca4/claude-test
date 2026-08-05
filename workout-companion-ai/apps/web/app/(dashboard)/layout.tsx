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
      {/* Il contenuto scorre sotto la rail in vetro; in basso lo spazio serve
          alla barra flottante che compare sotto i 1024px. */}
      <main className="flex-1 min-w-0 px-5 py-6 pb-28 lg:px-10 lg:py-8 lg:pb-10 max-w-[1280px]">
        {children}
      </main>
    </div>
  );
}
