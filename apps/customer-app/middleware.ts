import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { SESSION_COOKIE, isProtected } from './lib/auth';

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
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
