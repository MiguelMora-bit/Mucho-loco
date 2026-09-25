'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useDashboardPaneStore } from '@/lib/stores/dashboardPane.store';
import { useT } from '@/lib/hooks/useT';
import { useAsyncSubmit } from '@/lib/hooks/useAsyncSubmit';
import { postJson, putJson } from '@/lib/api-client';
import { QrModal, OrderDetailModal, Header, HomePane, AccessPane, OrdersPane, CommunityPane, ProfilePane, SettingsPane } from './dashboard';
import type { UserProfile, MembershipInfo, Visit, Order, CommunityPost, Lang } from '@mucho-loco/types';

interface DashboardClientProps {
  profile: UserProfile;
  /** null = todavía no contrata (un socio nuevo nace sin membresía). */
  membership: MembershipInfo | null;
  /** Acaba de volver de pagar la membresía en Stripe. */
  justPaid: boolean;
  history: Visit[];
  orders: Order[];
  feed: CommunityPost[];
}

export default function DashboardClient({ profile: initialProfile, membership, justPaid, history, orders, feed }: DashboardClientProps) {
  // El teléfono se edita aquí mismo (spec 015): el perfil guardado reemplaza al de la página.
  const [profile, setProfile] = useState(initialProfile);
  async function handleSavePhone(phone: string) {
    setProfile(await putJson<UserProfile>('/api/profile/phone', { phone }));
  }
  const t = useT();
  const lang = useLocale() as Lang;
  const { pane, leaving } = useDashboardPaneStore();
  const [qrOpen, setQrOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [feedState, setFeedState] = useState(feed);
  const isActive = (key: typeof pane) => pane === key && !leaving;

  // Renovar arranca de lo que ya tiene; la página completa el resto.
  const planHref = membership ? `/membership?plan=${membership.tierKey}` : '/membership';

  const { loading: retryingPayment, error: retryError, run: runRetryPayment } = useAsyncSubmit({
    errorMessage: t.dashboard.home.retryPaymentError,
    connectionErrorMessage: t.common.connectionError,
  });

  // Periodo de gracia: se paga la factura que falló, en la página de Stripe.
  // Aquí no se "reintenta" nada — antes esto reactivaba la membresía sin
  // cobrar. Vuelve a `active` cuando el backend recibe invoice.paid.
  async function handleRetryPayment() {
    await runRetryPayment(async () => {
      const { url } = await postJson<{ url: string }>('/api/membership/invoice', {
        returnUrl: `${window.location.origin}/${lang}/dashboard`,
      });
      window.location.href = url;
    });
  }

  const { loading: managingSubscription, error: manageError, run: runManageSubscription } = useAsyncSubmit({
    errorMessage: t.dashboard.home.portalError,
    connectionErrorMessage: t.common.connectionError,
  });

  // Portal de Stripe (spec 005): cancelar/reactivar la renovación o cambiar
  // la tarjeta. Lo que el socio haga ahí llega por webhook; al volver a esta
  // página el Server Component relee la membresía.
  async function handleManageSubscription() {
    await runManageSubscription(async () => {
      const { url } = await postJson<{ url: string }>('/api/membership/portal', {
        returnUrl: `${window.location.origin}/${lang}/dashboard`,
        lang,
      });
      window.location.href = url;
    });
  }

  const { loading: postingCommunityPost, error: communityError, run: runCommunityAction } = useAsyncSubmit({
    errorMessage: t.dashboard.community.postError,
    connectionErrorMessage: t.common.connectionError,
  });

  function upsertPost(updated: CommunityPost) {
    setFeedState((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function handleCreatePost(body: string) {
    await runCommunityAction(async () => {
      const created = await postJson<CommunityPost>('/api/community/posts', { body });
      setFeedState((prev) => [created, ...prev]);
    });
  }

  async function handleToggleLike(postId: string) {
    await runCommunityAction(async () => {
      upsertPost(await postJson<CommunityPost>(`/api/community/posts/${postId}/like`, {}));
    });
  }

  async function handleAddComment(postId: string, body: string) {
    await runCommunityAction(async () => {
      upsertPost(await postJson<CommunityPost>(`/api/community/posts/${postId}/comments`, { body }));
    });
  }

  return (
    <>
      {membership && <QrModal t={t} open={qrOpen} onClose={() => setQrOpen(false)} accessCode={membership.accessCode} />}
      <OrderDetailModal t={t} lang={lang} order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      <Header t={t} pane={pane} avatarInitial={profile.name[0]} />

      <HomePane
        t={t}
        lang={lang}
        active={isActive('home')}
        profile={profile}
        membership={membership}
        justPaid={justPaid}
        planHref={planHref}
        onRetryPayment={handleRetryPayment}
        retryingPayment={retryingPayment}
        retryError={retryError}
        onManageSubscription={handleManageSubscription}
        managingSubscription={managingSubscription}
        manageError={manageError}
        onSavePhone={handleSavePhone}
      />
      <AccessPane t={t} lang={lang} active={isActive('access')} profile={profile} membership={membership} planHref={planHref} history={history} onShowQr={() => setQrOpen(true)} />
      <OrdersPane t={t} lang={lang} active={isActive('orders')} orders={orders} onSelectOrder={setSelectedOrder} />
      <CommunityPane
        t={t}
        lang={lang}
        active={isActive('community')}
        posts={feedState}
        posting={postingCommunityPost}
        postError={communityError}
        onCreatePost={handleCreatePost}
        onToggleLike={handleToggleLike}
        onAddComment={handleAddComment}
      />
      <ProfilePane t={t} lang={lang} active={isActive('profile')} profile={profile} membership={membership} planHref={planHref} onSavePhone={handleSavePhone} />
      <SettingsPane t={t} active={isActive('settings')} />
    </>
  );
}
