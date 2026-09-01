'use client';

import { useState } from 'react';
import { useLogout } from '@/lib/hooks/useLogout';
import { useDashboardPaneStore } from '@/lib/stores/dashboardPane.store';
import { QrModal, Header, HomePane, AccessPane, OrdersPane, ProfilePane } from './dashboard';
import type { UserProfile, MembershipInfo, Visit, Order } from '@mucho-loco/types';

interface DashboardClientProps {
  profile: UserProfile;
  membership: MembershipInfo;
  history: Visit[];
  orders: Order[];
}

export default function DashboardClient({ profile, membership, history, orders }: DashboardClientProps) {
  const logout = useLogout();
  const { pane, leaving, setPane } = useDashboardPaneStore();
  const [qrOpen, setQrOpen] = useState(false);
  const isActive = (key: typeof pane) => pane === key && !leaving;

  return (
    <>
      <QrModal open={qrOpen} onClose={() => setQrOpen(false)} />
      <Header pane={pane} avatarInitial={profile.name[0]} />

      <HomePane active={isActive('home')} profile={profile} membership={membership} onRenew={() => setPane('access')} />
      <AccessPane active={isActive('access')} profile={profile} membership={membership} history={history} onShowQr={() => setQrOpen(true)} />
      <OrdersPane active={isActive('orders')} orders={orders} />
      <ProfilePane active={isActive('profile')} profile={profile} membership={membership} onRenew={() => setPane('access')} onLogout={logout} />
    </>
  );
}
