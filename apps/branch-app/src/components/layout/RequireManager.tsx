import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '../../lib/stores/auth.store';

/**
 * Autorización, no autenticación — ProtectedRoute (que ya corrió antes de
 * esta ruta) se queda role-agnostic a propósito. Cubre los dos flancos: el
 * nav item ya está oculto para 'staff' en AppShell, y esto rechaza también
 * la navegación directa por URL.
 */
export function RequireManager() {
  const role = useAuthStore((s) => s.user?.role);
  if (role !== 'manager') return <Navigate to="/" replace />;
  return <Outlet />;
}
