'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Plus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { buttonPrimary, buttonGhost, inputClass } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * Invito cliente (v1): crea il legame coach-cliente in stato "invited".
 * Il cliente si registra sull'app con la stessa email e viene collegato.
 * Il pannello vive sul livello VETRO (è un foglio di controlli); il campo e
 * l'errore poggiano su ferro opaco, così restano sempre leggibili.
 */
export function InviteClientForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Esc chiude il foglio e riporta il fuoco sul comando che l'ha aperto.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

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
      setError('Sessione scaduta. Ricarica la pagina ed effettua di nuovo l’accesso.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('coach_clients').insert({
      coach_id: user.id,
      invite_email: email.trim().toLowerCase(),
      status: 'invited',
    });

    if (error) {
      setError('Invito non inviato: ' + error.message);
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
      <button
        ref={triggerRef}
        type="button"
        className={cn(buttonPrimary, 'min-h-[44px]')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Plus size={17} aria-hidden />
        Nuovo cliente
      </button>

      {open && (
        <form
          onSubmit={handleInvite}
          role="dialog"
          aria-label="Invita un nuovo cliente"
          className="glass-chrome absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw_-_2.5rem)] rounded-lg p-5 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
              Invita un atleta
            </p>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              aria-label="Chiudi il pannello di invito"
              className="press -mr-1.5 -mt-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-secondary transition hover:text-white"
            >
              <X size={16} aria-hidden />
            </button>
          </div>

          <label htmlFor="invite-email" className="mt-3 block text-[15px] font-semibold text-white">
            Email del cliente
          </label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cn(inputClass, 'mt-2', error && 'border-rose')}
            placeholder="cliente@email.com"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'invite-error' : 'invite-hint'}
            autoFocus
          />

          {error ? (
            <p
              id="invite-error"
              role="alert"
              className="mt-2.5 flex items-start gap-2 rounded-xs bg-raised px-3 py-2.5 text-[13px] leading-snug text-rose"
            >
              <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
              {error}
            </p>
          ) : (
            <p id="invite-hint" className="mt-2 text-[13px] leading-snug text-text-secondary">
              Deve registrarsi sull’app con questa email: comparirà nel roster come «Invitato».
            </p>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button type="submit" disabled={loading} className={cn(buttonPrimary, 'min-h-[44px] flex-1')}>
              {loading ? 'Invio…' : 'Invia invito'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className={cn(buttonGhost, 'min-h-[44px]')}
            >
              Annulla
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
