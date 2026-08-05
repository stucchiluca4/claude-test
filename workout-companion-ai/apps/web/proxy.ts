import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function proxy(request: NextRequest) {
  /**
   * Vetrina pubblica: ogni rotta con `?demo=1` mostra dati d'esempio e va
   * lasciata passare senza sessione. Senza sessione la RLS di Supabase non
   * restituisce nulla, quindi non può trapelare alcun dato reale.
   */
  const isDemoQuery = request.nextUrl.searchParams.get('demo') === '1';
  const requestHeaders = new Headers(request.headers);
  if (isDemoQuery) requestHeaders.set('x-demo-mode', '1');
  const forward = { request: { headers: requestHeaders } };

  let response = NextResponse.next(forward);

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
          response = NextResponse.next(forward);
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

  const isAuthFlow = request.nextUrl.pathname.startsWith('/auth');
  const isPublicDemo = request.nextUrl.pathname.startsWith('/demo');
  const isAthleteDemo = request.nextUrl.pathname.startsWith('/atleta-demo');
  const isStitchAsset = request.nextUrl.pathname.startsWith('/stitch-demo');

  if (request.nextUrl.pathname === '/' && request.nextUrl.searchParams.has('code')) {
    const confirmUrl = new URL('/auth/confirm', request.url);
    confirmUrl.searchParams.set('code', request.nextUrl.searchParams.get('code')!);
    return NextResponse.redirect(confirmUrl);
  }

  if (
    !user &&
    !isAuthPage &&
    !isAuthFlow &&
    !isPublicDemo &&
    !isAthleteDemo &&
    !isStitchAsset &&
    !isDemoQuery &&
    request.nextUrl.pathname !== '/'
  ) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|ico)$).*)',
  ],
};
