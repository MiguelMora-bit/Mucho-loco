import { create } from 'zustand';
import { authService } from '../auth';
import { needsRefresh } from '../auth/expiry';
import { secureStorage } from '../auth/secure-storage';
import { AuthError, type Session, type SocialProvider } from '../auth/types';

const SESSION_KEY = 'ml_session';

/**
 * `restoring` mientras se lee el llavero al abrir la app. Sin ese estado, la
 * pantalla de Cuenta pintaría un instante el login aunque haya sesión.
 */
type SessionStatus = 'restoring' | 'signedOut' | 'signedIn';

interface SessionState {
  status: SessionStatus;
  session: Session | null;
  restore: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  /** `false` si el socio cerró el navegador sin terminar. */
  signInWithProvider: (provider: SocialProvider) => Promise<boolean>;
  signOut: () => Promise<void>;
  /**
   * El `getToken` del cliente HTTP (`lib/api.ts`): el ID token vigente,
   * refrescado antes si está por vencer. `undefined` = no hay sesión.
   */
  getFreshIdToken: () => Promise<string | undefined>;
}

async function persist(session: Session | null): Promise<void> {
  if (session) await secureStorage.set(SESSION_KEY, JSON.stringify(session));
  else await secureStorage.remove(SESSION_KEY);
}

// Un solo refresh en vuelo. El panel pide 4 cosas a la vez al abrirse: con
// el token vencido, las 4 llegan aquí juntas y Cognito debe recibir UNA
// llamada, no cuatro.
let inflight: Promise<Session | null> | null = null;

/**
 * Sesión del socio. Hace el trabajo que en customer-app reparten el
 * middleware (¿hay cookie?), las rutas `/api/auth/*` (login, logout) y
 * `useSessionRefresh` (renovar el token): aquí no hay servidor en medio.
 */
export const useSessionStore = create<SessionState>()((set, get) => {
  async function start(session: Session) {
    await persist(session);
    set({ session, status: 'signedIn' });
  }

  async function end() {
    await persist(null);
    set({ session: null, status: 'signedOut' });
  }

  /**
   * Refresca, y decide qué hacer si falla:
   * - Cognito dijo que no (refresh token revocado o vencido a los 30 días):
   *   la sesión ya no sirve, se cierra.
   * - Falla de red: NO se cierra. Sin señal en el gym el socio tiene que
   *   poder abrir su QR, que es fijo y no necesita red.
   */
  function refresh(current: Session): Promise<Session | null> {
    if (!inflight) {
      inflight = authService
        .refresh(current)
        .then(async (fresh) => {
          await start(fresh);
          return fresh;
        })
        .catch(async (err: unknown) => {
          if (err instanceof AuthError) {
            await end();
            return null;
          }
          throw err;
        })
        .finally(() => {
          inflight = null;
        });
    }
    return inflight;
  }

  return {
    status: 'restoring',
    session: null,

    restore: async () => {
      let session: Session | null = null;
      try {
        const raw = await secureStorage.get(SESSION_KEY);
        session = raw ? (JSON.parse(raw) as Session) : null;
      } catch {
        session = null;
      }
      if (!session) {
        set({ session: null, status: 'signedOut' });
        return;
      }
      // Con sesión guardada se entra de inmediato (el QR tiene que abrir aun
      // sin red); si el token está por vencer se refresca en segundo plano.
      set({ session, status: 'signedIn' });
      if (needsRefresh(session, Date.now())) refresh(session).catch(() => {});
    },

    signIn: async (email, password) => {
      await start(await authService.signIn(email, password));
    },

    signInWithProvider: async (provider) => {
      const session = await authService.signInWithProvider(provider);
      if (!session) return false;
      await start(session);
      return true;
    },

    signOut: async () => {
      const { session } = get();
      // Cerrar sesión local SIEMPRE, aunque Cognito no conteste: el socio
      // pidió salir, no puede quedarse dentro porque no hay red.
      if (session) await authService.signOut(session).catch(() => {});
      await end();
    },

    getFreshIdToken: async () => {
      const { session } = get();
      if (!session) return undefined;
      if (!needsRefresh(session, Date.now())) return session.idToken;
      return (await refresh(session))?.idToken;
    },
  };
});
