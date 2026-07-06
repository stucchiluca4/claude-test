import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/sidebar';
import { fullName } from '@/lib/utils';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={fullName(profile)} />
      <main className="flex-1 px-8 py-6 max-w-[1400px]">{children}</main>
    </div>
  );
}
