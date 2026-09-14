import { Dashboard } from '@/components/account/Dashboard';
import { AuthPanel } from '@/components/auth/AuthPanel';
import { Screen } from '@/components/ui';
import { useSessionStore } from '@/lib/stores/session.store';

/**
 * Sin sesión, login; con sesión, el panel del socio. En la web esto son dos
 * rutas (`/account` y `/dashboard`) más un middleware que redirige entre
 * ellas; en una pestaña basta con decidir qué pintar.
 */
export default function AccountScreen() {
  const session = useSessionStore((s) => s.session);

  if (!session) {
    return (
      <Screen>
        <AuthPanel />
      </Screen>
    );
  }
  return <Dashboard email={session.email} />;
}
