'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useDashboardPaneStore } from '@/lib/stores/dashboardPane.store';
import { useT } from '@/lib/hooks/useT';
import { QrModal, OrderDetailModal, Header, HomePane, AccessPane, OrdersPane, ProfilePane, SettingsPane } from './dashboard';
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
  const { pane, leaving, setPane } = useDashboardPaneStore();
  const [qrOpen, setQrOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const isActive = (key: typeof pane) => pane === key && !leaving;

  return (
    <>
      <QrModal t={t} open={qrOpen} onClose={() => setQrOpen(false)} accessCode={membership.accessCode} />
      <OrderDetailModal t={t} lang={lang} order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      <Header t={t} pane={pane} avatarInitial={profile.name[0]} />

      <HomePane t={t} active={isActive('home')} profile={profile} membership={membership} onRenew={() => setPane('access')} />
      <AccessPane t={t} active={isActive('access')} profile={profile} membership={membership} history={history} onShowQr={() => setQrOpen(true)} />
      <OrdersPane t={t} lang={lang} active={isActive('orders')} orders={orders} onSelectOrder={setSelectedOrder} />
      <ProfilePane t={t} active={isActive('profile')} profile={profile} membership={membership} onRenew={() => setPane('access')} />
      <SettingsPane t={t} active={isActive('settings')} />
    </>
  );
}
