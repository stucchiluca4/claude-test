'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { buttonPrimary, inputClass } from '@/components/ui';

/**
 * Invito cliente (v1): crea il legame coach-cliente in stato "invited".
 * Il cliente si registra sull'app con la stessa email e viene collegato.
 */
export function InviteClientForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Sessione scaduta o utente non autenticato: evita il TypeError su user.id
    if (!user) {
      setError('Errore: sessione scaduta. Ricarica la pagina ed effettua di nuovo l’accesso.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('coach_clients').insert({
      coach_id: user.id,
      invite_email: email.trim().toLowerCase(),
      status: 'invited',
    });

    if (error) {
      setError('Errore: ' + error.message);
      setLoading(false);
      return;
    }

    setEmail('');
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="relative">
      <button className={buttonPrimary} onClick={() => setOpen(!open)}>
        + Nuovo cliente
      </button>

      {open && (
        <form
          onSubmit={handleInvite}
          className="absolute right-0 mt-2 w-80 glass rounded-xl p-4 shadow-xl z-10"
        >
          <label className="block text-sm mb-1.5 text-text-secondary">Email del cliente</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="cliente@email.com"
            autoFocus
          />
          {error && <p className="text-danger text-xs mt-2">{error}</p>}
          <button type="submit" disabled={loading} className={buttonPrimary + ' w-full mt-3'}>
            {loading ? 'Invio…' : 'Invita cliente'}
          </button>
        </form>
      )}
    </div>
  );
}
