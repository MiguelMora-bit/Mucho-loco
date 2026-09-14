import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { SESSION_COOKIE, NEXT_PARAM, isProtected } from './lib/auth';

const intlMiddleware = createMiddleware(routing);

function getLocalePrefix(pathname: string): string {
  const match = pathname.match(/^\/(en)(\/|$)/);
  return match ? `/${match[1]}` : '';
}

function cleanPath(pathname: string): string {
  const prefix = getLocalePrefix(pathname);
  return prefix ? pathname.slice(prefix.length) || '/' : pathname;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const path = cleanPath(pathname);

  if (isProtected(path)) {
    if (!request.cookies.get(SESSION_COOKIE)) {
      const url = request.nextUrl.clone();
      url.pathname = `${getLocalePrefix(pathname)}/account`;
      // Con la query: el landing manda a /membership?plan=all&period=monthly,
      // y el plan que eligió no se tiene que perder por pasar por el login.
      url.searchParams.set(NEXT_PARAM, pathname + request.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
