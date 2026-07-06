'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { buttonPrimary, inputClass } from '@/components/ui';

export function CheckinReviewForm({
  checkinId,
  initialFeedback,
}: {
  checkinId: string;
  initialFeedback: string | null;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState(initialFeedback ?? '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase
      .from('checkins')
      .update({
        coach_feedback: feedback,
        status: 'reviewed',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', checkinId);

    setLoading(false);
    if (!error) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={feedback}
        onChange={(e) => {
          setFeedback(e.target.value);
          setSaved(false);
        }}
        rows={4}
        className={inputClass}
        placeholder="Scrivi qui il feedback per il cliente: cosa va bene, cosa aggiustare questa settimana…"
      />
      <button type="submit" disabled={loading || !feedback} className={buttonPrimary + ' mt-3'}>
        {loading ? 'Invio…' : saved ? '✓ Feedback inviato' : 'Invia feedback e segna come rivisto'}
      </button>
    </form>
  );
}
