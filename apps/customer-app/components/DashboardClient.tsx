'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useLogout } from '@/lib/hooks/useLogout';
import { useDashboardPaneStore } from '@/lib/stores/dashboardPane.store';
import { useT } from '@/lib/hooks/useT';
import { QrModal, Header, HomePane, AccessPane, OrdersPane, ProfilePane } from './dashboard';
import type { UserProfile, MembershipInfo, Visit, Order, Lang } from '@mucho-loco/types';

interface DashboardClientProps {
  profile: UserProfile;
  membership: MembershipInfo;
  history: Visit[];
  orders: Order[];
}

export default function DashboardClient({ profile, membership, history, orders }: DashboardClientProps) {
  const t = useT();
  const lang = useLocale() as Lang;
  const logout = useLogout();
  const { pane, leaving, setPane } = useDashboardPaneStore();
  const [qrOpen, setQrOpen] = useState(false);
  const isActive = (key: typeof pane) => pane === key && !leaving;

  return (
    <>
      <QrModal t={t} open={qrOpen} onClose={() => setQrOpen(false)} />
      <Header t={t} pane={pane} avatarInitial={profile.name[0]} />

      <HomePane t={t} active={isActive('home')} profile={profile} membership={membership} onRenew={() => setPane('access')} />
      <AccessPane t={t} active={isActive('access')} profile={profile} membership={membership} history={history} onShowQr={() => setQrOpen(true)} />
      <OrdersPane t={t} lang={lang} active={isActive('orders')} orders={orders} />
      <ProfilePane t={t} active={isActive('profile')} profile={profile} membership={membership} onRenew={() => setPane('access')} onLogout={logout} />
    </>
  );
}
