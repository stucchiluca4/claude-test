import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { PlanButtons } from './plan-buttons';

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  athlete_pro: 'Athlete Pro',
  coach_starter: 'Coach Starter',
  coach_pro: 'Coach Pro',
  coach_elite: 'Coach Elite',
  gym: 'Gym/Team',
};

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_key, status, trial_ends_at, current_period_end, cancel_at_period_end')
    .eq('profile_id', user!.id)
    .maybeSingle();

  return (
    <div>
      <PageHeader
        title="Pagamenti & Abbonamento"
        subtitle="Gestisci il tuo piano. I pagamenti sono gestiti in sicurezza da Stripe."
      />

      <Card className="mb-6">
        <h3 className="font-semibold mb-3">Il tuo piano attuale</h3>
        {!sub ? (
          <p className="text-sm text-text-secondary">
            Nessun abbonamento attivo — sei nel piano <b className="text-text-primary">Free</b>.
            Scegli un piano qui sotto per sbloccare tutte le funzionalità.
          </p>
        ) : (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-xl font-bold">{PLAN_LABELS[sub.plan_key] ?? sub.plan_key}</span>
            <Badge
              color={
                sub.status === 'active' ? 'success' : sub.status === 'trialing' ? 'accent' : 'danger'
              }
            >
              {sub.status === 'active'
                ? 'Attivo'
                : sub.status === 'trialing'
                  ? `In prova fino al ${formatDate(sub.trial_ends_at)}`
                  : sub.status}
            </Badge>
            {sub.current_period_end && (
              <span className="text-text-secondary">
                {sub.cancel_at_period_end ? 'Termina il' : 'Si rinnova il'}{' '}
                {formatDate(sub.current_period_end)}
              </span>
            )}
          </div>
        )}
      </Card>

      <PlanButtons hasSubscription={!!sub} />
    </div>
  );
}
