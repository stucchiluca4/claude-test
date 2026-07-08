import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui';
import { OffersManager, type Offer } from './offers-manager';

export default async function ListinoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: offers } = await supabase
    .from('coach_offers')
    .select(
      'id, coach_id, name, description, duration_months, check_frequency, price_cents, currency, is_published, sort_order, created_at'
    )
    .eq('coach_id', user!.id)
    .order('sort_order', { ascending: true });

  return (
    <div>
      <PageHeader
        title="Listino Coaching Online"
        subtitle="Gestisci i tuoi piani di coaching e i relativi prezzi."
      />
      <OffersManager offers={(offers ?? []) as Offer[]} />
    </div>
  );
}
