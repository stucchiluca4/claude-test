import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Middleware: gira prima di ogni pagina.
 * 1. Mantiene aggiornata la sessione di login (cookie).
 * 2. Se non sei loggato e provi ad aprire l'area riservata → ti manda al login.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/registrati');

  // /auth/* (es. conferma email) deve restare raggiungibile senza sessione
  const isAuthFlow = request.nextUrl.pathname.startsWith('/auth');

  // Link di conferma che atterra sulla home con ?code=... → completa l'accesso
  if (request.nextUrl.pathname === '/' && request.nextUrl.searchParams.has('code')) {
    const confirmUrl = new URL('/auth/confirm', request.url);
    confirmUrl.searchParams.set('code', request.nextUrl.searchParams.get('code')!);
    return NextResponse.redirect(confirmUrl);
  }

  if (!user && !isAuthPage && !isAuthFlow && request.nextUrl.pathname !== '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  // Applica il middleware a tutto tranne file statici e API di Stripe (webhook firmato)
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|ico)$).*)'],
};
