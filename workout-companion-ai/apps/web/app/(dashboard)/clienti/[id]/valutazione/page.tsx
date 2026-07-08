import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui';
import { fullName } from '@/lib/utils';
import { AssessmentPanel } from './assessment-panel';

export default async function BodyAssessmentPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: cc } = await supabase
    .from('coach_clients')
    .select(
      'id, invite_email, client:profiles!coach_clients_client_id_fkey(id, first_name, last_name, sex, date_of_birth)'
    )
    .eq('id', params.id)
    .single();

  if (!cc) notFound();

  const client = cc.client as any;

  const { data: assessments } = await supabase
    .from('body_assessments')
    .select('*')
    .eq('coach_client_id', cc.id)
    .order('measured_at', { ascending: false })
    .order('created_at', { ascending: false });

  return (
    <div>
      <PageHeader
        title={`Valutazione corporea — ${client ? fullName(client) : (cc.invite_email ?? 'Cliente')}`}
        subtitle="Plicometria, circonferenze e stima della composizione corporea."
      />
      <AssessmentPanel
        ccId={cc.id}
        sex={client?.sex ?? null}
        dateOfBirth={client?.date_of_birth ?? null}
        assessments={assessments ?? []}
      />
    </div>
  );
}
