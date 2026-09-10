import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '../../lib/stores/auth.store';

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
