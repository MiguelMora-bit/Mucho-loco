import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OwnerUser {
  email: string;
  name: string;
}

interface Session {
  user: OwnerUser;
  idToken: string;
  refreshToken: string;
  idTokenExp: number; // epoch seconds
}

interface AuthState {
  user: OwnerUser | null;
  idToken: string | null;
  refreshToken: string | null;
  idTokenExp: number | null;
  setSession: (session: Session) => void;
  updateIdToken: (idToken: string, idTokenExp: number) => void;
  clear: () => void;
}

// persist en localStorage a propósito: SPA sin servidor propio, no hay cookie
// httpOnly posible — sobrevive a un refresh de página, igual que el resto del
// estado de esta app (createAsyncResource.ts ya usa localStorage para idioma).
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      idToken: null,
      refreshToken: null,
      idTokenExp: null,
      setSession: (session) => set({
        user: session.user,
        idToken: session.idToken,
        refreshToken: session.refreshToken,
        idTokenExp: session.idTokenExp,
      }),
      updateIdToken: (idToken, idTokenExp) => set({ idToken, idTokenExp }),
      clear: () => set({ user: null, idToken: null, refreshToken: null, idTokenExp: null }),
    }),
    { name: 'ml_owner_session' }
  )
);
