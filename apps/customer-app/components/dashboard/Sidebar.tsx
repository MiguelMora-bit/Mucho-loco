'use client';

import Image from 'next/image';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { useLogout } from '@/lib/hooks/useLogout';
import { useDashboardPaneStore } from '@/lib/stores/dashboardPane.store';
import { NAV_ITEMS } from './types';
import type { PaneKey } from './types';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();
  const { pane, setPane } = useDashboardPaneStore();
  const onDashboard = pathname === '/dashboard';

  function goToPane(key: PaneKey) {
    setPane(key);
    if (!onDashboard) router.push('/dashboard');
  }

  return (
    <aside className="[background:linear-gradient(180deg,#100606,#050202)] border-r border-ml-border flex flex-col py-6 sticky top-0 h-screen">
      <div className="side-brand flex items-center gap-3 px-5.5 pb-6 border-b border-ml-border">
        <Image src="/assets/bull-head.png" width={44} height={44} className="w-11 h-11 object-contain drop-shadow-red" alt="" />
        <div className="side-brand-name font-display text-xl leading-none">MUCHO<br /><span className="text-ml-red">LOCO</span></div>
      </div>
      <nav className="px-3.5 py-4.5 flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map((item) => (
          <button key={item.key} className={'nav-item' + (onDashboard && pane === item.key ? ' active' : '')} onClick={() => goToPane(item.key)}>
            <span className="text-xl">{item.icon}</span>
            <span className="side-label">{item.label}</span>
          </button>
        ))}
        <Link href="/performance" className={'nav-item no-underline' + (pathname === '/performance' ? ' active' : '')}>
          <span className="text-xl">📈</span>
          <span className="side-label">RENDIMIENTO</span>
        </Link>
      </nav>
      <div className="side-foot px-5.5 py-3.5 border-t border-ml-border text-11 text-ml-muted font-mono tracking-wide uppercase">
        <Link href="/" className="text-ml-cream-dim no-underline block mb-2">← VOLVER AL SITIO</Link>
        <button onClick={logout} className="bg-transparent border-none text-ml-cream-dim cursor-pointer font-mono text-11 tracking-wide uppercase p-0">CERRAR SESIÓN</button>
      </div>
    </aside>
  );
}
