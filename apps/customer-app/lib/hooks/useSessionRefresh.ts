'use client';

import { useEffect } from 'react';
import type { AuthUser } from '@mucho-loco/types';
import { useRouter } from '@/i18n/routing';
import { postJson, ApiError } from '../api-client';
import { useAuthStore } from '../stores/auth.store';

// Menor al id_token_validity de Cognito (60 min, ver infra/modules/cognito)
// para que siempre alcance a refrescar el ID token antes de que expire.
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

/** Mantiene viva la sesión en páginas protegidas renovando el ID token vía refresh token. */
export function useSessionRefresh(): void {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const data = await postJson<{ ok: boolean; user: AuthUser }>('/api/auth/refresh', {});
        setUser(data.user);
      } catch (err) {
        if (err instanceof ApiError) {
          clear();
          router.push('/account');
        }
      }
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router, setUser, clear]);
}
