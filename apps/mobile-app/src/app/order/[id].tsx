import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { formatDate } from '@mucho-loco/customer-core/dates';
import { orderStatusLabel } from '@mucho-loco/customer-core/order-status';
import { shippingAddressLines } from '@mucho-loco/customer-core/shipping';
import { formatPrice } from '@mucho-loco/customer-core/pricing';
import { Body, Button, Card, Display, ErrorState, Heading, Loading, Mono, Screen } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { imageSource } from '@/lib/images';
import { paymentLabel } from '@/lib/payment-labels';
import { userRepository } from '@/lib/repositories';
import { useSessionStore } from '@/lib/stores/session.store';
import { useMaxBrightness } from '@/lib/use-max-brightness';
import { useResource } from '@/lib/use-resource';
import { colors, space } from '@/theme';

/**
 * Detalle de un pedido (`OrderDetailModal` de la web). El QR codifica el id
 * del pedido — lo que escanea mostrador en branch-app al entregar.
 *
 * El contrato no tiene `getOrderById`: se piden los pedidos del socio y se
 * busca el id. Con el volumen de pedidos de un socio no vale la pena un
 * endpoint nuevo todavía.
 */
export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useT();
  const router = useRouter();
  const email = useSessionStore((s) => s.session?.email);
  const o = t.dashboard.orders;
  useMaxBrightness();

  const load = useCallback(async () => {
    if (!email) return null;
    const orders = await userRepository.getOrders(email);
    return orders.find((order) => order.id === id) ?? null;
  }, [email, id]);
  const { state, reload } = useResource(load);

  return (
    <Screen safeTop={false}>
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && (
        <ErrorState message={t.common.connectionError} retryLabel={t.error.retry} onRetry={reload} />
      )}
      {state.status === 'ready' && !state.data && <Body>{t.product.notFound}</Body>}
      {state.status === 'ready' && state.data && (
        <>
          <View style={styles.row}>
            <Mono>
              {state.data.id} · {formatDate(state.data.date, lang)}
            </Mono>
            <Mono style={styles.status}>{orderStatusLabel(state.data.status, t, state.data.delivery)}</Mono>
          </View>

          {state.data.items.map((item, i) => (
            <Card key={i} style={styles.item}>
              <Image source={imageSource(item.img)} style={styles.img} contentFit="cover" />
              <View style={styles.fill}>
                <Heading style={styles.itemName}>
                  {item.name}
                  {item.qty > 1 ? ` × ${item.qty}` : ''}
                </Heading>
                <Body>{item.flav}</Body>
              </View>
            </Card>
          ))}

          <Display style={styles.red}>{formatPrice(state.data.total)} MXN</Display>
          <View style={styles.row}>
            <Mono>{o.paymentMethodLabel}</Mono>
            <Heading style={styles.method}>{paymentLabel(state.data.paymentMethod, t)}</Heading>
          </View>

          {state.data.status !== 'done' && state.data.delivery === 'pickup' && (
            <View style={styles.pickup}>
              <Mono>{o.showQrLabel}</Mono>
              <View style={styles.qr} accessibilityLabel={state.data.id}>
                <QRCode value={state.data.id} size={180} ecl="M" color="#000000" backgroundColor="#ffffff" />
              </View>
              <Body style={styles.center}>
                {o.pickupNote} <Body style={styles.cream}>{state.data.branch}</Body>
              </Body>
            </View>
          )}
          {/* A domicilio no hay QR ni sucursal: se muestra a dónde se envía. */}
          {state.data.delivery === 'home' && (
            <View style={styles.shipTo}>
              <Mono>{o.shipToLabel}</Mono>
              {state.data.shippingAddress ? (
                shippingAddressLines(state.data.shippingAddress).map((line, i) => (
                  <Body key={i} style={i === 0 ? styles.cream : undefined}>
                    {line}
                  </Body>
                ))
              ) : (
                <Body>—</Body>
              )}
              {state.data.trackingNumber && (
                <Mono>
                  {o.trackingLabel}: {state.data.trackingNumber}
                </Mono>
              )}
            </View>
          )}
          {state.data.status === 'done' && state.data.delivery === 'pickup' && (
            <Body>
              {o.deliveredBranchPrefix} <Body style={styles.cream}>{state.data.branch}</Body> {o.deliveredAtPrefix}{' '}
              <Body style={styles.cream}>
                {state.data.deliveredAt &&
                  formatDate(state.data.deliveredAt, lang, {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
              </Body>
            </Body>
          )}
        </>
      )}
      <Button title={o.close} variant="outline" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  red: { color: colors.red },
  cream: { color: colors.cream },
  status: { color: colors.green },
  fill: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  img: { width: 48, height: 48, backgroundColor: colors.card2 },
  itemName: { fontSize: 18 },
  method: { fontSize: 18 },
  pickup: { alignItems: 'center', gap: space.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.md },
  shipTo: { gap: space.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.md },
  qr: { backgroundColor: '#ffffff', padding: space.md },
  center: { textAlign: 'center' },
});
