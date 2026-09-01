import { create } from 'zustand';
import type { PaneKey } from '@/components/dashboard/types';

interface DashboardPaneStore {
  pane: PaneKey;
  setPane: (pane: PaneKey) => void;
}

export const useDashboardPaneStore = create<DashboardPaneStore>()((set) => ({
  pane: 'home',
  setPane: (pane) => set({ pane }),
}));
