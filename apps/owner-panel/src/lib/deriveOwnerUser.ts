export interface OwnerUser {
  email: string;
  name: string;
}

interface VerifiedClaims {
  email: string;
  name: string;
  groups: string[];
}

/**
 * Deriva la identidad de dueño a partir de claims YA verificados (firma
 * comprobada, ver lib/jwt.ts) — null si la cuenta no pertenece al grupo
 * 'owner'. Usado tanto en el login como en ProtectedRoute (re-verificado en
 * cada acceso, nunca se confía en el `user` cacheado en localStorage solo).
 */
export function deriveOwnerUser(claims: VerifiedClaims, fallbackEmail: string): OwnerUser | null {
  if (!claims.groups.includes('owner')) return null;
  return { email: claims.email || fallbackEmail, name: claims.name };
}
