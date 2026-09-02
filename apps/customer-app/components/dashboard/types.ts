export type PaneKey = 'home' | 'access' | 'orders' | 'profile';

export const NAV_ITEMS: Array<{ key: PaneKey; icon: string }> = [
  { key: 'home', icon: '🏠' },
  { key: 'access', icon: '🎫' },
  { key: 'orders', icon: '📦' },
  { key: 'profile', icon: '⚙️' },
];
