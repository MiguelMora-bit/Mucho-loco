export type PaneKey = 'home' | 'access' | 'orders' | 'profile';

export const NAV_ITEMS: Array<{ key: PaneKey; label: string; icon: string }> = [
  { key: 'home', label: 'INICIO', icon: '🏠' },
  { key: 'access', label: 'MI ACCESO', icon: '🎫' },
  { key: 'orders', label: 'MIS PEDIDOS', icon: '📦' },
  { key: 'profile', label: 'MI PERFIL', icon: '⚙️' },
];
