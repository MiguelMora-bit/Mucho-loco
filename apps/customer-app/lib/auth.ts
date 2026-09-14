export const SESSION_COOKIE = 'ml_session';
/** Refresh token de Cognito — solo lo lee app/api/auth/refresh, nunca el middleware. */
export const REFRESH_COOKIE = 'ml_refresh';
export const PROTECTED_PATHS = ['/dashboard', '/performance', '/checkout', '/membership'];
/** Query param the middleware appends to the /account redirect so login can send the user back. */
export const NEXT_PARAM = 'next';

export function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}
