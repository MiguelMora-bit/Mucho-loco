'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useDashboardPaneStore } from '@/lib/stores/dashboardPane.store';
import { useT } from '@/lib/hooks/useT';
import { useAsyncSubmit } from '@/lib/hooks/useAsyncSubmit';
import { postJson } from '@/lib/api-client';
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
  const [membershipState, setMembershipState] = useState(membership);
  const isActive = (key: typeof pane) => pane === key && !leaving;

  const { loading: retryingPayment, error: retryError, run: runRetryPayment } = useAsyncSubmit({
    errorMessage: t.dashboard.home.retryPaymentError,
    connectionErrorMessage: t.common.connectionError,
  });

  async function handleRetryPayment() {
    await runRetryPayment(async () => {
      const updated = await postJson<MembershipInfo>('/api/membership/retry-payment', {});
      setMembershipState(updated);
    });
  }

  return (
    <>
      <QrModal t={t} open={qrOpen} onClose={() => setQrOpen(false)} accessCode={membershipState.accessCode} />
      <OrderDetailModal t={t} lang={lang} order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      <Header t={t} pane={pane} avatarInitial={profile.name[0]} />

      <HomePane
        t={t}
        active={isActive('home')}
        profile={profile}
        membership={membershipState}
        onRenew={() => setPane('access')}
        onRetryPayment={handleRetryPayment}
        retryingPayment={retryingPayment}
        retryError={retryError}
      />
      <AccessPane t={t} active={isActive('access')} profile={profile} membership={membershipState} history={history} onShowQr={() => setQrOpen(true)} />
      <OrdersPane t={t} lang={lang} active={isActive('orders')} orders={orders} onSelectOrder={setSelectedOrder} />
      <ProfilePane t={t} active={isActive('profile')} profile={profile} membership={membershipState} onRenew={() => setPane('access')} />
      <SettingsPane t={t} active={isActive('settings')} />
    </>
  );
}
