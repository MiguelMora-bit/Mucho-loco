import { create } from 'zustand';
import type { PaneKey } from '@/components/dashboard/types';

// Must match the .pane CSS transition duration in globals.css.
const PANE_TRANSITION_MS = 180;

interface DashboardPaneStore {
  pane: PaneKey;
  /** True for the brief window where the outgoing pane is fading out and no pane should show as active. */
  leaving: boolean;
  setPane: (pane: PaneKey) => void;
}

export const useDashboardPaneStore = create<DashboardPaneStore>()((set, get) => ({
  pane: 'home',
  leaving: false,
  setPane: (pane) => {
    if (pane === get().pane) return;
    set({ leaving: true });
    setTimeout(() => set({ pane, leaving: false }), PANE_TRANSITION_MS);
  },
}));
