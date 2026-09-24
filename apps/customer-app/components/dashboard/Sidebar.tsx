'use client';

import type { ReactNode } from 'react';
import { LuHouse, LuQrCode, LuPackage, LuUsers, LuCircleUser, LuSettings, LuTrendingUp, LuReceipt, LuLogOut } from 'react-icons/lu';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { useLogout } from '@/lib/hooks/useLogout';
import { useDashboardPaneStore } from '@/lib/stores/dashboardPane.store';
import { useT } from '@/lib/hooks/useT';
import { NAV_ITEMS } from './types';
import type { PaneKey } from './types';

const NAV_ICON: Record<PaneKey, ReactNode> = {
  home: <LuHouse size={20} />,
  access: <LuQrCode size={20} />,
  orders: <LuPackage size={20} />,
  community: <LuUsers size={20} />,
  profile: <LuCircleUser size={20} />,
  settings: <LuSettings size={20} />,
};

const NAV_ANIM: Record<PaneKey, string> = {
  home: 'icon-bounce',
  access: 'icon-glow',
  orders: 'icon-wobble',
  community: 'icon-breathe',
  profile: 'icon-breathe',
  settings: 'icon-spin',
};

export function Sidebar() {
  const t = useT();
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
    <aside className="[background:linear-gradient(180deg,#100606,#050202)] border-r border-ml-border flex flex-col py-6 h-full overflow-y-auto">
      <nav className="px-3.5 py-4.5 flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = onDashboard && pane === item.key;
          return (
            <button key={item.key} className={'nav-item' + (isActive ? ' active' : '')} onClick={() => goToPane(item.key)}>
              <span className={'nav-icon' + (isActive ? ' ' + NAV_ANIM[item.key] : '')}>{NAV_ICON[item.key]}</span>
              <span className="side-label">{t.dashboard.nav[item.key]}</span>
            </button>
          );
        })}
        <Link href="/performance" className={'nav-item no-underline' + (pathname === '/performance' ? ' active' : '')}>
          <span className={'nav-icon' + (pathname === '/performance' ? ' icon-rise' : '')}><LuTrendingUp size={20} /></span>
          <span className="side-label">{t.dashboard.nav.performance}</span>
        </Link>
        <Link href="/invoicing" className={'nav-item no-underline' + (pathname === '/invoicing' ? ' active' : '')}>
          <span className={'nav-icon' + (pathname === '/invoicing' ? ' icon-wobble' : '')}><LuReceipt size={20} /></span>
          <span className="side-label">{t.dashboard.nav.invoicing}</span>
        </Link>
      </nav>
      <div className="side-foot px-3.5 py-3.5 border-t border-ml-border">
        <button onClick={logout} className="logout-btn">
          <LuLogOut size={18} className="logout-icon" />
          <span className="font-mono text-11 tracking-wide uppercase">{t.dashboard.nav.logout}</span>
        </button>
      </div>
    </aside>
  );
}
