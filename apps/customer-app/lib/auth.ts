export const SESSION_COOKIE = 'ml_session';
export const PROTECTED_PATHS = ['/panel', '/rendimiento', '/checkout'];

export function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some(p => pathname.startsWith(p));
}
