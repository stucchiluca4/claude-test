import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * Atterraggio del link di conferma ricevuto via email.
 * Verifica il token, crea la sessione (cookie) e porta l'utente
 * direttamente in dashboard: niente login manuale dopo la conferma.
 * Gestisce entrambi i formati usati da Supabase (token_hash e code).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const code = url.searchParams.get('code');

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL('/dashboard', url.origin));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL('/dashboard', url.origin));
  }

  // Link scaduto o non valido: si può comunque accedere con email e password
  return NextResponse.redirect(new URL('/login', url.origin));
}
