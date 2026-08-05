import { createClient } from '@/lib/supabase/server';
import { Badge, PageHeader } from '@/components/ui';
import { OffersManager, type Offer } from './offers-manager';

const DEMO_OFFERS: Offer[] = [
  {
    id: 'demo-basic',
    coach_id: 'demo',
    name: 'Online Coaching Start',
    description: 'Programma mensile, check settimanale e chat asincrona. Ideale per iniziare.',
    duration_months: 1,
    check_frequency: 'settimanale',
    price_cents: 14900,
    currency: 'EUR',
    is_published: true,
    sort_order: 1,
    created_at: '2026-07-01T00:00:00Z',
  },
  {
    id: 'demo-pro',
    coach_id: 'demo',
    name: 'Performance Pro',
    description: 'Allenamento, nutrizione, biofeedback e report avanzato ogni settimana.',
    duration_months: 3,
    check_frequency: 'settimanale',
    price_cents: 39900,
    currency: 'EUR',
    is_published: true,
    sort_order: 2,
    created_at: '2026-07-01T00:00:00Z',
  },
  {
    id: 'demo-elite',
    coach_id: 'demo',
    name: 'Elite Transformation',
    description: 'Percorso premium con priorita chat, review video e adattamenti rapidi.',
    duration_months: 6,
    check_frequency: 'bisettimanale',
    price_cents: 79900,
    currency: 'EUR',
    is_published: false,
    sort_order: 3,
    created_at: '2026-07-01T00:00:00Z',
  },
];

export default async function ListinoPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  if (demo === '1') {
    return (
      <div>
        <PageHeader
          title="Listino Coaching Online"
          subtitle="Stesso listino, compilato con offerte di esempio: pronto da mostrare in call."
          actions={<Badge color="accent">Dati demo</Badge>}
        />
        <OffersManager offers={DEMO_OFFERS} />
      </div>
    );
  }

  const supabase = await createClient();
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
        subtitle="Costruisci i pacchetti che vendi — prezzo, durata e ritmo dei check. Pubblica solo quelli pronti."
      />
      <OffersManager offers={(offers ?? []) as Offer[]} />
    </div>
  );
}
