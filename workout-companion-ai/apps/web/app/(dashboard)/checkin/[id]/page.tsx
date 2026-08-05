import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Camera, CheckCircle2, Clock3, Hourglass, MessageSquareQuote } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, KpiCard, buttonSecondary } from '@/components/ui';
import { cn, fullName, formatDate, formatKg } from '@/lib/utils';
import { CheckinReviewForm } from './review-form';

/**
 * Le scale 1-10 parlano la stessa lingua del DotScale dell'app: dieci segmenti
 * in fila e il segnale del significato — ciano per il corpo che recupera,
 * menta per ciò che è andato fatto, ambra per lo sforzo e il disagio.
 */
type ScaleTone = 'cyan' | 'mint' | 'amber';

const SCALE_TONE: Record<ScaleTone, { fill: string; text: string }> = {
  cyan: { fill: 'bg-cyan', text: 'text-cyan' },
  mint: { fill: 'bg-mint', text: 'text-mint' },
  amber: { fill: 'bg-amber', text: 'text-amber' },
};

const SCALES: {
  key: string;
  label: string;
  tone: ScaleTone;
  bands: [string, string, string];
}[] = [
  { key: 'sleep_quality', label: 'Qualità del sonno', tone: 'cyan', bands: ['scarso', 'discreto', 'buono'] },
  { key: 'energy_level', label: 'Energia', tone: 'mint', bands: ['scarica', 'discreta', 'al top'] },
  { key: 'stress_level', label: 'Stress', tone: 'amber', bands: ['basso', 'medio', 'alto'] },
  { key: 'hunger_level', label: 'Fame', tone: 'amber', bands: ['bassa', 'media', 'alta'] },
  { key: 'muscle_soreness', label: 'Dolori muscolari (DOMS)', tone: 'amber', bands: ['assenti', 'presenti', 'forti'] },
  { key: 'joint_stress', label: 'Stress articolare', tone: 'amber', bands: ['assente', 'presente', 'forte'] },
  { key: 'recovery', label: 'Recupero', tone: 'cyan', bands: ['scarso', 'parziale', 'pieno'] },
];

const POSE_LABEL: Record<string, string> = {
  front: 'Frontale',
  side_right: 'Laterale destro',
  side_left: 'Laterale sinistro',
  back: 'Posteriore',
};

const STATUS_META: Record<
  string,
  { label: string; color: 'warning' | 'success' | 'default'; icon: typeof Clock3 }
> = {
  submitted: { label: 'Da valutare', color: 'warning', icon: Clock3 },
  reviewed: { label: 'Valutato', color: 'success', icon: CheckCircle2 },
  pending: { label: 'In attesa', color: 'default', icon: Hourglass },
};

function bandLabel(value: number, bands: [string, string, string]): string {
  if (value <= 3) return bands[0];
  if (value <= 6) return bands[1];
  return bands[2];
}

/** Scala a segmenti orizzontali: dieci blocchi, il valore e la sua parola. */
function SegmentedScale({
  label,
  value,
  tone,
  bands,
}: {
  label: string;
  value: number | null;
  tone: ScaleTone;
  bands: [string, string, string];
}) {
  const t = SCALE_TONE[tone];
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-semibold text-white">{label}</span>
        <span
          className={cn(
            'shrink-0 text-[13px] font-bold tnum',
            value != null ? t.text : 'text-text-secondary'
          )}
        >
          {value != null ? `${value}/10 · ${bandLabel(value, bands)}` : 'non indicato'}
        </span>
      </div>
      <div
        className="mt-2 flex gap-[3px]"
        role="img"
        aria-label={`${label}: ${value != null ? `${value} su 10, ${bandLabel(value, bands)}` : 'non indicato'}`}
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <span
            key={n}
            className={cn(
              'h-3 flex-1 rounded-[4px]',
              value != null && n <= value ? t.fill : 'bg-raised'
            )}
          />
        ))}
      </div>
    </li>
  );
}

/** Griglia foto: stesso raggio, stesso rapporto, nessun ritaglio del corpo. */
function PhotoGrid({ photos }: { photos: { pose: string; url: string | null }[] }) {
  if (photos.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-md bg-raised px-5 py-6">
        <Camera size={20} className="shrink-0 text-text-tertiary" aria-hidden />
        <p className="text-[15px] text-text-secondary">
          Nessuna foto allegata a questo check-in.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {photos.map((p, i) => (
        <figure key={`${p.pose}-${i}`} className="min-w-0">
          <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-raised">
            {p.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.url}
                alt={`Foto ${POSE_LABEL[p.pose] ?? p.pose}`}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-text-tertiary" aria-hidden>
                <Camera size={22} />
              </div>
            )}
          </div>
          <figcaption className="mt-2 text-center text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
            {POSE_LABEL[p.pose] ?? p.pose}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/** Struttura condivisa tra dati reali e modalità demo: una sola verità visiva. */
function CheckinDetailView({
  title,
  subtitle,
  actions,
  weightKg,
  avgSteps,
  trainingAdherence,
  nutritionAdherence,
  scales,
  photos,
  notes,
  footer,
}: {
  title: string;
  subtitle: string;
  actions: React.ReactNode;
  weightKg: number | null;
  avgSteps: number | null;
  trainingAdherence: number | null;
  nutritionAdherence: number | null;
  scales: Record<string, number | null>;
  photos: { pose: string; url: string | null }[];
  notes: string | null;
  footer: React.ReactNode;
}) {
  const adherenceTone = (v: number | null): 'mint' | 'amber' | 'neutral' =>
    v == null ? 'neutral' : v >= 80 ? 'mint' : 'amber';

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} actions={actions} />

      {/* ---------- I numeri della settimana ---------- */}
      <section aria-label="Misure della settimana" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="[&>div]:[animation-delay:0ms]">
          <KpiCard label="Peso" value={formatKg(weightKg)} tone="neutral" />
        </div>
        <div className="[&>div]:[animation-delay:50ms]">
          <KpiCard
            label="Aderenza allenamento"
            value={trainingAdherence != null ? `${trainingAdherence}%` : '—'}
            delta={
              trainingAdherence == null
                ? undefined
                : trainingAdherence >= 80
                  ? 'Programma rispettato'
                  : 'Sotto il minimo utile'
            }
            deltaGood={trainingAdherence != null && trainingAdherence >= 80}
            tone={adherenceTone(trainingAdherence)}
          />
        </div>
        <div className="[&>div]:[animation-delay:100ms]">
          <KpiCard
            label="Aderenza nutrizione"
            value={nutritionAdherence != null ? `${nutritionAdherence}%` : '—'}
            delta={
              nutritionAdherence == null
                ? undefined
                : nutritionAdherence >= 80
                  ? 'Piano rispettato'
                  : 'Da rivedere insieme'
            }
            deltaGood={nutritionAdherence != null && nutritionAdherence >= 80}
            tone={adherenceTone(nutritionAdherence)}
          />
        </div>
        <div className="[&>div]:[animation-delay:150ms]">
          <KpiCard
            label="Passi medi"
            value={avgSteps != null ? avgSteps.toLocaleString('it-IT') : '—'}
            tone="cyan"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ---------- Foto e parole del cliente ---------- */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="rise rise-3">
            <div className="mb-4 flex items-center gap-2.5">
              <Camera size={19} className="shrink-0 text-text-secondary" aria-hidden />
              <h2 className="text-[17px] font-bold text-white">Foto del check</h2>
            </div>
            <PhotoGrid photos={photos} />
          </Card>

          <Card className="rise rise-4">
            <div className="mb-3 flex items-center gap-2.5">
              <MessageSquareQuote size={19} className="shrink-0 text-text-secondary" aria-hidden />
              <h2 className="text-[17px] font-bold text-white">Note del cliente</h2>
            </div>
            {notes ? (
              <p className="whitespace-pre-wrap rounded-md bg-raised px-5 py-4 text-[15px] leading-relaxed text-white">
                {notes}
              </p>
            ) : (
              <p className="rounded-md bg-raised px-5 py-4 text-[15px] text-text-secondary">
                Nessuna nota scritta questa settimana: leggi i numeri e le foto.
              </p>
            )}
          </Card>
        </div>

        {/* ---------- Benessere: le scale 1-10 ---------- */}
        <Card className="rise rise-3 lg:col-span-1">
          <h2 className="text-[17px] font-bold text-white">Benessere della settimana</h2>
          <p className="mt-1 text-[13px] text-text-secondary">
            Come il cliente ha vissuto i sette giorni, sulla scala da 1 a 10 dell&apos;app.
          </p>
          <ul className="mt-5 space-y-4">
            {SCALES.map((s) => (
              <SegmentedScale
                key={s.key}
                label={s.label}
                value={scales[s.key] ?? null}
                tone={s.tone}
                bands={s.bands}
              />
            ))}
          </ul>
        </Card>
      </div>

      {footer}
    </div>
  );
}

export default async function CheckinDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ demo?: string }>;
}) {
  const { id } = await params;
  const { demo } = await searchParams;

  if (demo === '1') {
    return <DemoCheckinDetail id={id} />;
  }

  const supabase = await createClient();

  const { data: ci } = await supabase
    .from('checkins')
    .select(
      `*, coach_client:coach_clients(client:profiles!coach_clients_client_id_fkey(first_name, last_name)),
       checkin_photos (id, pose, storage_path)`
    )
    .eq('id', id)
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

  const meta = STATUS_META[ci.status as string] ?? STATUS_META.pending;
  const StatusIcon = meta.icon;
  const reviewed = ci.status === 'reviewed';

  const scales: Record<string, number | null> = {};
  for (const s of SCALES) scales[s.key] = ((ci as any)[s.key] as number | null) ?? null;

  return (
    <CheckinDetailView
      title={`Check-in — ${fullName((ci.coach_client as any)?.client ?? null)}`}
      subtitle={`Settimana del ${formatDate(ci.week_start)} · inviato il ${formatDate(ci.submitted_at)}`}
      actions={
        <>
          <Badge color={meta.color}>
            <StatusIcon size={12} className="mr-1.5" aria-hidden />
            {meta.label}
          </Badge>
          <Link href="/checkin" className={cn(buttonSecondary, 'min-h-[44px]')}>
            <ArrowLeft size={16} aria-hidden />
            Tutti i check-in
          </Link>
        </>
      }
      weightKg={ci.weight_kg}
      avgSteps={ci.avg_steps}
      trainingAdherence={ci.training_adherence}
      nutritionAdherence={ci.nutrition_adherence}
      scales={scales}
      photos={photos}
      notes={ci.client_notes}
      footer={
        /* La barra d'azione vive sul VETRO e resta ancorata in basso: il
           feedback è sempre a portata di mano mentre si leggono i dati. */
        <div
          className={cn(
            // `!` obbligatorio: .glass-chrome è dichiarata dopo le utility e
            // altrimenti riporterebbe position/box-shadow ai suoi valori.
            // Sotto i 1024px resta in flusso: lì il basso è della barra di navigazione.
            'glass-chrome z-30 rounded-2xl p-4 sm:p-5 lg:!sticky lg:bottom-6',
            !reviewed &&
              '!shadow-[0_0_0_1px_rgba(10,132,255,0.35),0_-12px_48px_rgba(0,0,0,0.6)]'
          )}
        >
          <CheckinReviewForm
            checkinId={ci.id}
            initialFeedback={ci.coach_feedback}
            reviewed={reviewed}
          />
        </div>
      }
    />
  );
}

function DemoCheckinDetail({ id }: { id: string }) {
  const name = id.includes('2') ? 'Marco Bellini' : id.includes('3') ? 'Giulia Rinaldi' : 'Andrea Costa';
  const hard = id.includes('1');
  const metrics = {
    weight_kg: id.includes('3') ? 61.8 : id.includes('2') ? 76.1 : 82.4,
    avg_steps: 9340,
    training_adherence: hard ? 68 : 94,
    nutrition_adherence: hard ? 72 : 91,
    sleep_quality: hard ? 5 : 8,
    stress_level: hard ? 8 : 4,
    energy_level: hard ? 5 : 8,
    hunger_level: 6,
    muscle_soreness: hard ? 8 : 5,
    joint_stress: hard ? 6 : 2,
    recovery: hard ? 5 : 8,
  };

  const scales: Record<string, number | null> = {};
  for (const s of SCALES) scales[s.key] = (metrics as any)[s.key] as number;

  return (
    <CheckinDetailView
      title={`Check-in — ${name}`}
      subtitle="Settimana del 20/07/2026 · dati demo compilati"
      actions={
        <>
          <Badge color="accent">Demo</Badge>
          <Link href="/checkin?demo=1" className={cn(buttonSecondary, 'min-h-[44px]')}>
            <ArrowLeft size={16} aria-hidden />
            Tutti i check-in
          </Link>
        </>
      }
      weightKg={metrics.weight_kg}
      avgSteps={metrics.avg_steps}
      trainingAdherence={metrics.training_adherence}
      nutritionAdherence={metrics.nutrition_adherence}
      scales={scales}
      photos={['front', 'side_right', 'side_left', 'back'].map((pose) => ({ pose, url: null }))}
      notes="Settimana intensa. Allenamenti completati, ma gambe molto affaticate e sonno non perfetto negli ultimi due giorni."
      footer={
        /* In demo il feedback è già scritto: resta su FERRO, perché è testo da leggere. */
        <Card className="rise rise-5">
          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <h2 className="text-[17px] font-bold text-white">Feedback del coach</h2>
            <Badge color="success">
              <CheckCircle2 size={12} className="mr-1.5" aria-hidden />
              Inviato
            </Badge>
          </div>
          <p className="rounded-md bg-raised px-5 py-4 text-[15px] leading-relaxed text-white">
            Ottimo lavoro sulla costanza. Per i prossimi 3 giorni abbassiamo volume gambe e teniamo
            proteine stabili. Se il sonno torna sopra 7/10, riprendiamo progressione normale.
          </p>
        </Card>
      }
    />
  );
}
