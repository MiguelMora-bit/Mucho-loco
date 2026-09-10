import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router';
import { InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient, COGNITO_CLIENT_ID } from '../../lib/cognito';
import { verifyIdToken } from '../../lib/jwt';
import { deriveOwnerUser } from '../../lib/deriveOwnerUser';
import { useAuthStore } from '../../lib/stores/auth.store';

type Status = 'checking' | 'authenticated' | 'denied';

/**
 * Antes solo comprobaba `if (!user)` — el `user` cacheado en localStorage
 * (persist de zustand) no tenía ninguna firma propia, así que cualquiera
 * podía editarlo a mano en devtools y entrar sin login real. Ahora SIEMPRE
 * re-verifica el idToken (firma+expiración vía Cognito) antes de conceder
 * acceso, y re-deriva el rol/identidad del token verificado — nunca del
 * objeto cacheado — para que tocar el localStorage no sirva de nada.
 * Ver auditoría de seguridad 2026-09-10.
 */
export function ProtectedRoute() {
  const idToken = useAuthStore((s) => s.idToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!idToken || !refreshToken) {
        if (!cancelled) setStatus('denied');
        return;
      }

      try {
        const claims = await verifyIdToken(idToken);
        const user = deriveOwnerUser(claims, '');
        if (!user) throw new Error('not owner');
        // Re-sincroniza `user` con lo que dice el token verificado — si
        // alguien tocó el objeto cacheado (ej. su propio email/nombre) sin
        // tocar el token, esto lo corrige aunque el token siga vigente.
        setSession({ user, idToken, refreshToken, idTokenExp: claims.exp });
        if (!cancelled) setStatus('authenticated');
        return;
      } catch {
        // Firma inválida o expiró — solo un refresh real contra Cognito
        // puede reestablecer confianza (o confirmar que la sesión es falsa).
      }

      try {
        const auth = await cognitoClient.send(new InitiateAuthCommand({
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          ClientId: COGNITO_CLIENT_ID,
          AuthParameters: { REFRESH_TOKEN: refreshToken },
        }));
        const newIdToken = auth.AuthenticationResult?.IdToken;
        if (!newIdToken) throw new Error('no id token');
        const claims = await verifyIdToken(newIdToken);
        const user = deriveOwnerUser(claims, '');
        if (!user) throw new Error('not owner');
        setSession({ user, idToken: newIdToken, refreshToken, idTokenExp: claims.exp });
        if (!cancelled) setStatus('authenticated');
      } catch {
        clear();
        if (!cancelled) setStatus('denied');
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [idToken, refreshToken, setSession, clear]);

  if (status === 'checking') {
    return <div className="min-h-screen flex items-center justify-center text-ml-cream-dim text-sm font-mono">Verificando sesión…</div>;
  }
  if (status === 'denied') return <Navigate to="/login" replace />;
  return <Outlet />;
}
