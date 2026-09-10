import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type StaffRole = 'staff' | 'manager';

export interface StaffUser {
  email: string;
  name: string;
  role: StaffRole;
  branchId: number;
  branchName: string;
}

interface Session {
  user: StaffUser;
  idToken: string;
  refreshToken: string;
  idTokenExp: number; // epoch seconds
}

interface AuthState {
  user: StaffUser | null;
  idToken: string | null;
  refreshToken: string | null;
  idTokenExp: number | null;
  setSession: (session: Session) => void;
  updateIdToken: (idToken: string, idTokenExp: number) => void;
  clear: () => void;
}

// persist en localStorage a propósito: SPA sin servidor propio, no hay cookie
// httpOnly posible — mismo patrón que owner-panel.
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
    { name: 'ml_staff_session' }
  )
);
