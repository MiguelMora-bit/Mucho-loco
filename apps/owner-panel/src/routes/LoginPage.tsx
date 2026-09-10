import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient, COGNITO_CLIENT_ID } from '../lib/cognito';
import { verifyIdToken } from '../lib/jwt';
import { mapCognitoError } from '../lib/cognito-errors';
import { deriveOwnerUser } from '../lib/deriveOwnerUser';
import { useAuthStore } from '../lib/stores/auth.store';

function errorMessageFor(t: (key: string) => string, code: string): string {
  switch (code) {
    case 'WRONG_CREDENTIALS': return t('auth.errors.wrongCredentials');
    case 'NOT_CONFIRMED': return t('auth.errors.notConfirmed');
    case 'PASSWORD_RESET_REQUIRED': return t('auth.errors.passwordResetRequired');
    case 'TOO_MANY_ATTEMPTS': return t('auth.errors.tooManyAttempts');
    case 'NOT_OWNER': return t('auth.errors.notOwner');
    default: return t('auth.errors.unknown');
  }
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = (form.get('email') as string | null) ?? '';
    const password = (form.get('password') as string | null) ?? '';

    setLoading(true);
    setError(null);
    try {
      const auth = await cognitoClient.send(new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: COGNITO_CLIENT_ID,
        AuthParameters: { USERNAME: email, PASSWORD: password },
      }));
      const idToken = auth.AuthenticationResult?.IdToken;
      const refreshToken = auth.AuthenticationResult?.RefreshToken;
      if (!idToken || !refreshToken) {
        setError(errorMessageFor(t, 'UNKNOWN'));
        return;
      }

      const claims = await verifyIdToken(idToken);
      // Un solo User Pool compartido con customer-app/branch-app (ver
      // CLAUDE.md raíz) — cualquier cliente registrado puede autenticarse acá,
      // así que el gate real es pertenecer al grupo 'owner'.
      const user = deriveOwnerUser(claims, email);
      if (!user) {
        setError(errorMessageFor(t, 'NOT_OWNER'));
        return;
      }

      setSession({ user, idToken, refreshToken, idTokenExp: claims.exp });
      navigate('/');
    } catch (err) {
      setError(errorMessageFor(t, mapCognitoError(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ml-black px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-ml-black-2 border border-ml-border rounded p-8">
        <div className="flex items-center gap-3 mb-6">
          <img src="/assets/bull-head.png" alt="Mucho Loco" className="h-8 w-8 object-contain" />
          <span className="font-bold text-lg tracking-wide">
            MUCHO <span className="text-ml-red">LOCO</span>
          </span>
        </div>
        <h1 className="text-ml-cream-dim text-sm font-mono uppercase tracking-wide mb-6">{t('auth.title')}</h1>

        {error && <p className="text-ml-red text-xs font-mono mb-4">{error}</p>}

        <label className="block text-xs text-ml-cream-dim mb-1">{t('auth.emailLabel')}</label>
        <input name="email" type="email" required autoComplete="username" className="w-full mb-4 px-3 py-2 bg-ml-black border border-ml-border rounded text-sm" />

        <label className="block text-xs text-ml-cream-dim mb-1">{t('auth.passwordLabel')}</label>
        <input name="password" type="password" required autoComplete="current-password" className="w-full mb-6 px-3 py-2 bg-ml-black border border-ml-border rounded text-sm" />

        <button type="submit" disabled={loading} className="w-full py-2 bg-ml-red text-ml-cream rounded font-medium text-sm disabled:opacity-60">
          {loading ? t('auth.submitting') : t('auth.submit')}
        </button>
      </form>
    </div>
  );
}
