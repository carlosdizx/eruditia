import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/constants';

const PUBLIC_ROUTES = ['/login'];
// Portal de consulta de notas con año lectivo + documento.
const PUBLIC_PREFIXES = ['/consulta-notas/'];

// Chequeo optimista: solo mira si existe la cookie. La validez real de la
// sesión la decide la API en cada petición. /login no redirige aunque haya
// cookie: la sesión puede haber expirado por inactividad antes que la cookie.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  )
    return NextResponse.next();

  if (!request.cookies.has(SESSION_COOKIE))
    return NextResponse.redirect(new URL('/login', request.nextUrl));

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
