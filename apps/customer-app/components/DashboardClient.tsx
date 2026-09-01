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
  const { pane, setPane } = useDashboardPaneStore();
  const [qrOpen, setQrOpen] = useState(false);

  return (
    <>
      <QrModal open={qrOpen} onClose={() => setQrOpen(false)} />
      <Header pane={pane} avatarInitial={profile.name[0]} />

      <HomePane active={pane === 'home'} profile={profile} membership={membership} onRenew={() => setPane('access')} />
      <AccessPane active={pane === 'access'} profile={profile} membership={membership} history={history} onShowQr={() => setQrOpen(true)} />
      <OrdersPane active={pane === 'orders'} orders={orders} />
      <ProfilePane active={pane === 'profile'} profile={profile} membership={membership} onRenew={() => setPane('access')} onLogout={logout} />
    </>
  );
}
