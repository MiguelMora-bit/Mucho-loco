import * as Linking from 'expo-linking';
import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { OrderStatus } from '@mucho-loco/types';
import { formatDate, formatDayOfMonth, formatDuration, formatMonthShort } from '@mucho-loco/customer-core/dates';
import { orderStatusLabel } from '@mucho-loco/customer-core/order-status';
import { formatPrice } from '@mucho-loco/customer-core/pricing';
import { Body, Button, Card, Chip, Display, ErrorState, Heading, Loading, Mono, Screen } from '@/components/ui';
import { useLangStore, useT } from '@/lib/i18n';
import { paymentRepository, userRepository } from '@/lib/repositories';
import { useSessionStore } from '@/lib/stores/session.store';
import { useResource } from '@/lib/use-resource';
import { colors, space } from '@/theme';

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending_payment: colors.yellow,
  ready: colors.green,
  shipped: colors.orange,
  done: colors.creamDim,
};

/**
 * Panel del socio: lo esencial de `DashboardClient` de la web (inicio, acceso
 * con QR, pedidos, historial) en una sola pantalla con scroll, que es como se
 * lee en un teléfono. Comunidad y Rendimiento llegan después.
 */
export function Dashboard({ email }: { email: string }) {
  const { t, m, lang } = useT();
  const router = useRouter();
  const setLang = useLangStore((s) => s.setLang);
  const signOut = useSessionStore((s) => s.signOut);

  const load = useCallback(async () => {
    const [profile, membership, visits, orders] = await Promise.all([
      userRepository.getProfile(email),
      userRepository.getMembership(email),
      userRepository.getVisitHistory(email),
      userRepository.getOrders(email),
    ]);
    return { profile, membership, visits, orders };
  }, [email]);
  const { state, reload } = useResource(load);

  // Al VOLVER a la pestaña (por ejemplo, después de pagar en el checkout) se
  // recargan pedidos y membresía: una pestaña no se desmonta al salir de ella.
  // El primer foco se salta — coincide con el montaje, que ya está cargando;
  // sin esto cada endpoint del panel se pedía dos veces al abrirlo.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      reload();
    }, [reload]),
  );

  const [retrying, setRetrying] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);

  // Periodo de gracia: se paga la factura que falló en la página de Stripe.
  // Esa página no regresa sola; al cerrarla el panel recarga, y la membresía
  // vuelve a activa cuando el backend recibe invoice.paid.
  async function payPendingInvoice() {
    setRetrying(true);
    setRetryFailed(false);
    try {
      const returnUrl = Linking.createURL('/account');
      const { url } = await paymentRepository.openMembershipInvoice(email, returnUrl);
      // El mock "paga" al instante y responde con returnUrl: no hay página que abrir.
      if (!url.startsWith(returnUrl)) await WebBrowser.openBrowserAsync(url);
      reload();
    } catch {
      setRetryFailed(true);
    } finally {
      setRetrying(false);
    }
  }

  const [managing, setManaging] = useState(false);
  const [manageFailed, setManageFailed] = useState(false);

  // Portal de Stripe (spec 005): cancelar/reactivar la renovación o cambiar la
  // tarjeta. Lo que el socio haga ahí llega al backend por webhook; al volver
  // se relee la membresía.
  async function manageSubscription() {
    setManaging(true);
    setManageFailed(false);
    try {
      const returnUrl = Linking.createURL('/account');
      const { url } = await paymentRepository.openBillingPortal(email, returnUrl, lang);
      // El mock responde con returnUrl (ya "hizo algo en el portal"): no hay página que abrir.
      if (!url.startsWith(returnUrl)) await WebBrowser.openAuthSessionAsync(url, returnUrl);
      reload();
    } catch {
      setManageFailed(true);
    } finally {
      setManaging(false);
    }
  }

  if (state.status === 'loading') {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }
  if (state.status === 'error') {
    return (
      <Screen>
        <ErrorState message={t.common.connectionError} retryLabel={t.error.retry} onRetry={reload} />
      </Screen>
    );
  }

  const { profile, membership, visits, orders } = state.data;
  const home = t.dashboard.home;

  return (
    <Screen>
      <Mono>{t.dashboard.brandLabel}</Mono>
      <View>
        <Display>{home.welcomePrefix}</Display>
        <Display style={styles.red}>{profile.name.split(' ')[0]}</Display>
      </View>
      {membership && (
        <Body>
          {home.branchLabel} {membership.branch} · {home.planLabel} {membership.plan}
        </Body>
      )}

      {/* Un socio nuevo nace sin membresía: la activa su primera compra. */}
      {!membership && (
        <Card style={styles.banner}>
          <Heading>🏋️ {home.noMembershipTitle}</Heading>
          <Body>{home.noMembershipBody}</Body>
          <Button title={home.choosePlan} onPress={() => router.push('/membership')} />
        </Card>
      )}
      {membership?.status === 'expired' && (
        <Card style={styles.banner}>
          <Heading>🚫 {home.suspendedTitle}</Heading>
          <Body>{home.suspendedBody}</Body>
          <Button title={home.reactivate} onPress={() => router.push('/membership')} />
        </Card>
      )}
      {membership?.status === 'grace' && (
        <Card style={styles.banner}>
          <Heading>💳 {home.paymentFailedTitle}</Heading>
          <Body>
            {home.paymentFailedBody} {home.graceUntilPrefix}{' '}
            {membership.graceEndsAt ? formatDate(membership.graceEndsAt, lang) : ''}.
          </Body>
          {retryFailed && <Body style={styles.error}>{home.retryPaymentError}</Body>}
          <Button title={retrying ? t.common.updating : home.retryPayment} onPress={payPendingInvoice} loading={retrying} />
        </Card>
      )}
      {/* Con suscripción no hay nada que renovar: Stripe cobra solo. Con la
          renovación cancelada se reactiva en el portal, no contratando otra. */}
      {membership?.status === 'active' && !membership.hasSubscription && membership.daysLeft <= 15 && (
        <Card style={styles.banner}>
          <Heading>
            ⚠️ {home.membershipExpiringPrefix} {membership.daysLeft} {home.membershipExpiringSuffix}
          </Heading>
          <Body>
            {home.renewNotePrefix} {membership.streak} {home.renewNoteSuffix}
          </Body>
          <Button title={home.renew} onPress={() => router.push('/membership')} />
        </Card>
      )}
      {membership?.status === 'active' && membership.hasSubscription && !membership.autoRenews && (
        <Card style={styles.banner}>
          <Heading>
            ⏸️ {home.renewalCanceledPrefix} {formatDate(membership.expiresAt, lang)}.
          </Heading>
          {manageFailed && <Body style={styles.error}>{home.portalError}</Body>}
          <Button title={managing ? t.common.updating : home.reactivateRenewal} onPress={manageSubscription} loading={managing} />
        </Card>
      )}
      {membership?.status === 'active' && membership.autoRenews && (
        <>
          <Body>
            {home.autoRenewsPrefix} {formatDate(membership.expiresAt, lang)}.
          </Body>
          {manageFailed && <Body style={styles.error}>{home.portalError}</Body>}
          <Button title={home.manageSubscription} variant="outline" onPress={manageSubscription} loading={managing} />
        </>
      )}

      {membership && (
        <Card style={styles.pass}>
          <Heading>{profile.name}</Heading>
          <Mono>{membership.plan}</Mono>
          <View style={styles.passGrid}>
            <View style={styles.passCell}>
              <Mono>{t.dashboard.access.expiresLabel}</Mono>
              <Heading>{formatDate(membership.expiresAt, lang)}</Heading>
            </View>
            <View style={styles.passCell}>
              <Mono>{t.dashboard.access.branchLabel}</Mono>
              <Heading>{membership.tierKey === 'all' ? t.dashboard.access.allGyms : membership.branch}</Heading>
            </View>
          </View>
          {membership.status !== 'active' && (
            <Mono style={styles.error}>{t.dashboard.membershipStatus[membership.status]}</Mono>
          )}
          <Button
            title={membership.status === 'expired' ? t.dashboard.access.suspendedNote : t.dashboard.access.showQr}
            disabled={membership.status === 'expired'}
            onPress={() => router.push('/qr')}
          />
        </Card>
      )}

      <View style={styles.stats}>
        {[
          { label: home.statVisits, value: membership?.visits ?? 0 },
          { label: home.statStreak, value: membership?.streak ?? 0 },
          { label: home.statDaysLeft, value: membership?.daysLeft ?? 0 },
        ].map((s) => (
          <Card key={s.label} style={styles.stat}>
            <Display style={styles.statNum}>{s.value}</Display>
            <Mono>{s.label}</Mono>
          </Card>
        ))}
      </View>

      <View style={styles.row}>
        <Button
          title={t.dashboard.nav.community}
          variant="outline"
          onPress={() => router.push('/community')}
          style={styles.fill}
        />
        <Button
          title={t.dashboard.nav.performance}
          variant="outline"
          onPress={() => router.push('/performance')}
          style={styles.fill}
        />
      </View>
      <Button title={t.dashboard.nav.invoicing} variant="outline" onPress={() => router.push('/invoicing')} />

      <Heading>{t.dashboard.nav.orders}</Heading>
      {orders.length === 0 && <Body>{m.account.noOrders}</Body>}
      {orders.map((order) => (
        <Pressable
          key={order.id}
          accessibilityRole="button"
          accessibilityLabel={`${m.orders.detail} ${order.id}`}
          onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
          style={({ pressed }) => [styles.order, pressed && styles.pressed]}
        >
          <View style={styles.row}>
            <Mono>
              {order.id} · {formatDate(order.date, lang)}
            </Mono>
            <Mono style={{ color: STATUS_COLOR[order.status] }}>{orderStatusLabel(order.status, t, order.delivery)}</Mono>
          </View>
          {order.items.map((item, i) => (
            <Body key={i}>
              {item.name}
              {item.qty > 1 ? ` × ${item.qty}` : ''} · {item.flav}
            </Body>
          ))}
          <Heading style={styles.red}>{formatPrice(order.total)} MXN</Heading>
        </Pressable>
      ))}

      <Heading>{t.dashboard.access.accessHistory}</Heading>
      {visits.map((v) => (
        <View key={v.visitedAt} style={styles.visit}>
          <View style={styles.visitDate}>
            <Heading style={styles.red}>{formatDayOfMonth(v.visitedAt, lang)}</Heading>
            <Mono>{formatMonthShort(v.visitedAt, lang)}</Mono>
          </View>
          <View style={styles.fill}>
            <Body style={styles.cream}>{v.branch}</Body>
            <Mono>{t.dashboard.access.entryNote}</Mono>
          </View>
          <Mono style={styles.orange}>{formatDuration(v.durationMinutes, lang)}</Mono>
        </View>
      ))}

      <Heading>{m.account.language}</Heading>
      <View style={styles.row}>
        <Chip label="ESPAÑOL" active={lang === 'es'} onPress={() => setLang('es')} />
        <Chip label="ENGLISH" active={lang === 'en'} onPress={() => setLang('en')} />
      </View>

      <Button title={t.dashboard.nav.logout} variant="outline" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  red: { color: colors.red },
  cream: { color: colors.cream },
  orange: { color: colors.orange },
  error: { color: colors.redBright },
  fill: { flex: 1 },
  banner: { borderColor: colors.red, borderLeftWidth: 4, borderLeftColor: colors.redBright },
  pass: { borderColor: colors.red, gap: space.md },
  passGrid: { flexDirection: 'row', gap: space.md },
  passCell: { flex: 1, gap: space.xs },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1 },
  statNum: { fontSize: 36, lineHeight: 40 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  visit: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: space.sm },
  visitDate: { width: 48, alignItems: 'center' },
  order: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: space.md, gap: space.sm },
  pressed: { opacity: 0.75 },
});
