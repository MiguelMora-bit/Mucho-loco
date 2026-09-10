import { useAuthStore } from './stores/auth.store';

/**
 * Sucursal del staff logueado — ya NO es un placeholder (Fase 2, 2026-09-10):
 * viene del login real, ver LoginPage.tsx + staffDirectory.ts. Lanza si se
 * llama sin sesión porque cada punto de uso está detrás de ProtectedRoute.
 */
export function getCurrentBranchId(): number {
  const branchId = useAuthStore.getState().user?.branchId;
  if (branchId == null) {
    throw new Error('getCurrentBranchId() llamado sin sesión de staff activa');
  }
  return branchId;
}

export function getCurrentBranchName(): string {
  const branchName = useAuthStore.getState().user?.branchName;
  if (!branchName) {
    throw new Error('getCurrentBranchName() llamado sin sesión de staff activa');
  }
  return branchName;
}
