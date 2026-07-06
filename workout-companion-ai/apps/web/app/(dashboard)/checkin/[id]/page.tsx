import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge } from '@/components/ui';
import { fullName, formatDate, formatKg } from '@/lib/utils';
import { CheckinReviewForm } from './review-form';

const SCALE_FIELDS: [string, string][] = [
  ['sleep_quality', '😴 Qualità del sonno'],
  ['stress_level', '⚡ Livello di stress'],
  ['energy_level', '🔥 Livello di energia'],
  ['hunger_level', '🍽️ Fame'],
  ['muscle_soreness', '💪 Dolore muscolare'],
  ['joint_stress', '🦴 Stress articolare'],
  ['recovery', '❤️ Stato di recupero'],
];

export default async function CheckinDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: ci } = await supabase
    .from('checkins')
    .select(
      `*, coach_client:coach_clients(client:profiles!coach_clients_client_id_fkey(first_name, last_name)),
       checkin_photos (id, pose, storage_path)`
    )
    .eq('id', params.id)
    .single();

  if (!ci) notFound();

  // URL firmati e temporanei per le foto (bucket privato)
  const photos: { pose: string; url: string }[] = [];
  for (const p of (ci.checkin_photos as any[]) ?? []) {
    const { data } = await supabase.storage
      .from('checkin-photos')
      .createSignedUrl(p.storage_path, 3600);
    if (data?.signedUrl) photos.push({ pose: p.pose, url: data.signedUrl });
  }

  const POSE_LABEL: Record<string, string> = {
    front: 'Frontale',
    side_right: 'Laterale (dx)',
    side_left: 'Laterale (sx)',
    back: 'Posteriore',
  };

  return (
    <div>
      <PageHeader
        title={`Check-in — ${fullName((ci.coach_client as any)?.client ?? null)}`}
        subtitle={`Settimana del ${formatDate(ci.week_start)} · inviato il ${formatDate(ci.submitted_at)}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <h3 className="font-semibold mb-4">Misure & metriche</h3>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-secondary">Peso</dt>
              <dd className="font-semibold">{formatKg(ci.weight_kg)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Passi medi</dt>
              <dd>{ci.avg_steps?.toLocaleString('it-IT') ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Aderenza allenamento</dt>
              <dd>{ci.training_adherence != null ? `${ci.training_adherence}%` : '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Aderenza nutrizione</dt>
              <dd>{ci.nutrition_adherence != null ? `${ci.nutrition_adherence}%` : '—'}</dd>
            </div>
          </dl>

          <h3 className="font-semibold mt-6 mb-3">Benessere (1-10)</h3>
          <ul className="space-y-2.5">
            {SCALE_FIELDS.map(([field, label]) => {
              const value = (ci as any)[field] as number | null;
              return (
                <li key={field} className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-text-secondary">{label}</span>
                    <span className="font-medium">{value ?? '—'}/10</span>
                  </div>
                  {value != null && (
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${value * 10}%` }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="font-semibold mb-4">Foto check</h3>
          {photos.length === 0 ? (
            <p className="text-sm text-text-secondary">Nessuna foto allegata.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {photos.map((p) => (
                <figure key={p.pose}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={POSE_LABEL[p.pose]} className="rounded-lg w-full" />
                  <figcaption className="text-xs text-text-secondary mt-1 text-center">
                    {POSE_LABEL[p.pose] ?? p.pose}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          {ci.client_notes && (
            <>
              <h3 className="font-semibold mt-6 mb-2">Note del cliente</h3>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{ci.client_notes}</p>
            </>
          )}

          <h3 className="font-semibold mt-6 mb-2 flex items-center gap-2">
            Il tuo feedback
            {ci.status === 'reviewed' && <Badge color="success">Inviato</Badge>}
          </h3>
          <CheckinReviewForm checkinId={ci.id} initialFeedback={ci.coach_feedback} />
        </Card>
      </div>
    </div>
  );
}
