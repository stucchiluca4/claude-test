import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { PlanButtons } from './plan-buttons';
import { CalendarClock, ShieldCheck } from 'lucide-react';

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  athlete_pro: 'Athlete Pro',
  coach_starter: 'Coach Starter',
  coach_pro: 'Coach Pro',
  coach_elite: 'Coach Elite',
  gym: 'Gym/Team',
};

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  return <BillingContent demo={demo === '1'} />;
}

async function BillingContent({ demo = false }: { demo?: boolean }) {
  if (demo) {
    const sub = {
      plan_key: 'coach_elite',
      status: 'trialing',
      trial_ends_at: '2026-08-11',
      current_period_end: '2026-08-28',
      cancel_at_period_end: false,
    };

    return <BillingView sub={sub} />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_key, status, trial_ends_at, current_period_end, cancel_at_period_end')
    .eq('profile_id', user!.id)
    .maybeSingle();

  return <BillingView sub={sub} />;
}

function BillingView({ sub }: { sub: any }) {
  const planLabel = sub ? (PLAN_LABELS[sub.plan_key] ?? sub.plan_key) : 'Free';

  return (
    <div>
      <PageHeader
        title="Pagamenti & Abbonamento"
        subtitle="Il tuo piano e la sua scadenza, in chiaro. I pagamenti sono gestiti in sicurezza da Stripe."
        actions={
          <span className="inline-flex h-11 items-center gap-2 rounded-full bg-raised px-4 text-[13px] font-semibold text-text-secondary">
            <ShieldCheck size={16} aria-hidden />
            Protetto da Stripe
          </span>
        }
      />

      {/* ---------- Dove sei adesso: ferro, nessun bagliore ---------- */}
      <Card className="mb-6 rise">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
              Il tuo piano attuale
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-3">
              <span className="text-[34px] font-extrabold leading-none tracking-[-0.02em] text-white">
                {planLabel}
              </span>
              {sub && (
                <Badge
                  color={
                    sub.status === 'active'
                      ? 'success'
                      : sub.status === 'trialing'
                        ? 'accent'
                        : 'danger'
                  }
                >
                  {sub.status === 'active'
                    ? 'Attivo'
                    : sub.status === 'trialing'
                      ? `In prova fino al ${formatDate(sub.trial_ends_at)}`
                      : sub.status}
                </Badge>
              )}
            </div>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-text-secondary">
              {!sub
                ? 'Nessun abbonamento attivo: sei nel piano Free. Scegli un piano qui sotto per sbloccare tutte le funzionalità.'
                : 'Abbonamento gestito dal portale clienti Stripe.'}
            </p>
          </div>

          {sub?.current_period_end && (
            <div className="shrink-0 rounded-md bg-raised px-5 py-4">
              <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                <CalendarClock size={15} aria-hidden />
                {sub.cancel_at_period_end ? 'Termina il' : 'Si rinnova il'}
              </p>
              <p className="font-metric tnum mt-2 text-[26px] font-extrabold leading-none text-white">
                {formatDate(sub.current_period_end)}
              </p>
            </div>
          )}
        </div>
      </Card>

      <PlanButtons hasSubscription={!!sub} />
    </div>
  );
}
