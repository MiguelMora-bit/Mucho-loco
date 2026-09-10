import { lookupStaffBranch } from './staffDirectory';
import type { StaffRole, StaffUser } from './stores/auth.store';

interface VerifiedClaims {
  email: string;
  name: string;
  groups: string[];
}

export function roleFromGroups(groups: string[]): StaffRole | null {
  if (groups.includes('manager')) return 'manager';
  if (groups.includes('staff')) return 'staff';
  return null;
}

/**
 * Deriva rol + sucursal a partir de claims YA verificados (firma comprobada,
 * ver lib/jwt.ts) — null si no pertenece a staff/manager o no tiene sucursal
 * asignada en staffDirectory. Usado tanto en el login como en ProtectedRoute
 * (re-verificado en cada acceso, nunca se confía en el `user` cacheado en
 * localStorage solo).
 */
export function deriveStaffUser(claims: VerifiedClaims, fallbackEmail: string): StaffUser | null {
  const role = roleFromGroups(claims.groups);
  if (!role) return null;

  const email = claims.email || fallbackEmail;
  const branch = lookupStaffBranch(email);
  if (!branch) return null;

  return { email, name: claims.name, role, branchId: branch.branchId, branchName: branch.branchName };
}
