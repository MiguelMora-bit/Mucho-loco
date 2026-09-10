import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient, COGNITO_CLIENT_ID } from '../cognito';
import { verifyIdToken } from '../jwt';
import { useAuthStore } from '../stores/auth.store';

// Menor al id_token_validity de Cognito (60 min, ver infra/modules/cognito).
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Mantiene viva la sesión del dueño renovando el ID token vía refresh token
 * cada 15 min. Solo el keep-alive periódico — la verificación inicial (firma
 * + expiración, con fallback a refresh) ya la hace ProtectedRoute antes de
 * montar esta pantalla, así que no hace falta repetirla aquí al montar.
 */
export function useSessionRefresh(): void {
  const navigate = useNavigate();
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const updateIdToken = useAuthStore((s) => s.updateIdToken);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    if (!refreshToken) return;

    async function refresh() {
      try {
        const auth = await cognitoClient.send(new InitiateAuthCommand({
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          ClientId: COGNITO_CLIENT_ID,
          AuthParameters: { REFRESH_TOKEN: refreshToken! },
        }));
        const idToken = auth.AuthenticationResult?.IdToken;
        if (!idToken) throw new Error('NO_ID_TOKEN');
        const claims = await verifyIdToken(idToken);
        updateIdToken(idToken, claims.exp);
      } catch {
        clear();
        navigate('/login');
      }
    }

    const id = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refreshToken, updateIdToken, clear, navigate]);
}
