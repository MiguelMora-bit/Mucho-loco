export const SESSION_COOKIE = 'ml_session';
export const PROTECTED_PATHS = ['/dashboard', '/performance', '/checkout'];

export function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}
