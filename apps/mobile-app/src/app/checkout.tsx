import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { OnlinePaymentMethod, Translations } from '@mucho-loco/types';
import { formatPrice } from '@mucho-loco/customer-core/pricing';
import { Body, Button, Card, Display, Heading, Mono, Screen } from '@/components/ui';
import { checkoutTotals, orderLines, paymentMethodsFor, usesGateway, type Delivery } from '@/lib/checkout';
import { useT } from '@/lib/i18n';
import { paymentLabel } from '@/lib/payment-labels';
import { paymentRepository, userRepository } from '@/lib/repositories';
import { useCartStore } from '@/lib/stores/cart.store';
import { useSessionStore } from '@/lib/stores/session.store';
import { colors, space } from '@/theme';

function paymentNote(method: OnlinePaymentMethod, t: Translations): string {
  if (usesGateway(method)) return t.checkout.payment.redirectNote;
  if (method === 'cash') return t.checkout.payment.cashNote;
  return t.checkout.payment.transferNote;
}

/**
 * Checkout en una sola pantalla (la web lo parte en 3 pasos): entrega, método
 * de pago, resumen y confirmar.
 */
export default function CheckoutScreen() {
  const { t, m, lang } = useT();
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);

  const [delivery, setDelivery] = useState<Delivery>('pickup');
  const [method, setMethod] = useState<OnlinePaymentMethod>('card');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Delivery | null>(null);

  const methods = paymentMethodsFor(delivery);
  // Efectivo elegido y luego cambia a domicilio: efectivo deja de valer, se
  // cae al primer método disponible en vez de mandar una combinación inválida.
  const activeMethod = methods.includes(method) ? method : methods[0];
  const { subtotal, shipping, total } = checkoutTotals(items, delivery);

  if (placed) {
    return (
      <Screen safeTop={false}>
        <View>
          <Display>{t.checkout.confirmation.titleA}</Display>
          <Display style={styles.red}>{t.checkout.confirmation.titleB}</Display>
        </View>
        <Body>{t.checkout.confirmation.emailNote}</Body>
        <Body>{placed === 'pickup' ? t.checkout.confirmation.pickupNote : t.checkout.confirmation.homeNote}</Body>
        <Button title={t.checkout.confirmation.viewAccount} onPress={() => router.dismissTo('/account')} />
        <Button
          title={t.checkout.confirmation.keepShopping}
          variant="outline"
          onPress={() => router.dismissTo('/shop')}
        />
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen safeTop={false}>
        <Heading>{m.cart.loginToPay}</Heading>
        <Button title={t.account.loginTab} onPress={() => router.push('/login')} />
      </Screen>
    );
  }

  if (items.length === 0) {
    return (
      <Screen safeTop={false}>
        <Body>{t.checkout.cart.empty}</Body>
        <Button title={t.checkout.cart.goToShop} onPress={() => router.dismissTo('/shop')} />
      </Screen>
    );
  }

  async function placeOrder() {
    if (!session) return;
    setPlacing(true);
    setError(null);
    setNotice(null);
    const lines = orderLines(items);
    try {
      if (usesGateway(activeMethod)) {
        // A dónde regresa el socio desde Stripe: un deep link a esta misma
        // pantalla (mucholoco://checkout). `paid=1` distingue éxito de cancelar.
        const returnBase = Linking.createURL('/checkout');
        const successUrl = Linking.createURL('/checkout', { queryParams: { paid: '1' } });
        const { url } = await paymentRepository.createCheckoutSession(
          session.email,
          lines,
          delivery,
          lang,
          successUrl,
          returnBase,
        );
        // El mock no tiene pasarela: responde directo con la URL de éxito, que
        // es a donde Stripe habría regresado al socio (ver payment.mock.ts).
        // Con Stripe real, su página se abre en un navegador DENTRO de la app
        // y la sesión termina cuando Stripe redirige al deep link.
        if (!url.startsWith(returnBase)) {
          const result = await WebBrowser.openAuthSessionAsync(url, returnBase);
          if (result.type !== 'success' || !result.url.includes('paid=1')) {
            setNotice(m.checkout.gatewayCancelled);
            return;
          }
        }
      } else {
        await userRepository.createOrder(session.email, lines, activeMethod, delivery, lang);
      }
      clear();
      setPlaced(delivery);
    } catch {
      setError(t.checkout.errorPlacingOrder);
    } finally {
      setPlacing(false);
    }
  }

  const cartT = t.checkout.cart;

  return (
    <Screen safeTop={false}>
      <Heading>{m.checkout.delivery}</Heading>
      <View style={styles.options}>
        {(
          [
            ['pickup', cartT.pickupOption, cartT.pickupSub],
            ['home', cartT.homeOption, cartT.homeSub],
          ] as const
        ).map(([key, label, sub]) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: delivery === key }}
            accessibilityLabel={label}
            onPress={() => setDelivery(key)}
            style={[styles.option, delivery === key && styles.optionActive]}
          >
            <Heading>{label}</Heading>
            <Mono>{sub}</Mono>
          </Pressable>
        ))}
      </View>

      <Heading>{m.checkout.paymentMethod}</Heading>
      <View style={styles.options}>
        {methods.map((key) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: activeMethod === key }}
            accessibilityLabel={paymentLabel(key, t)}
            onPress={() => setMethod(key)}
            style={[styles.option, activeMethod === key && styles.optionActive]}
          >
            <Heading>{paymentLabel(key, t)}</Heading>
          </Pressable>
        ))}
      </View>
      <Mono style={styles.note}>{paymentNote(activeMethod, t)}</Mono>

      <Card>
        <Heading>{t.checkout.payment.yourOrder}</Heading>
        {items.map((item) => (
          <View key={item.id} style={styles.line}>
            <Body style={styles.lineName}>
              {item.name[lang]} × {item.qty}
            </Body>
            <Body>{formatPrice(item.price * item.qty)}</Body>
          </View>
        ))}
        <View style={styles.line}>
          <Body>{t.checkout.payment.subtotal}</Body>
          <Body>{formatPrice(subtotal)}</Body>
        </View>
        {shipping > 0 && (
          <View style={styles.line}>
            <Body>{t.checkout.payment.shippingLabel}</Body>
            <Body>{formatPrice(shipping)}</Body>
          </View>
        )}
        <View style={styles.line}>
          <Heading>{t.checkout.payment.total}</Heading>
          <Heading style={styles.red}>{formatPrice(total)}</Heading>
        </View>
      </Card>

      {error && <Body style={styles.error}>{error}</Body>}
      {notice && <Body style={styles.notice}>{notice}</Body>}

      <Button
        title={placing ? t.checkout.payment.processing : `🔥 ${t.checkout.payment.confirmOrder} · ${formatPrice(total)}`}
        onPress={placeOrder}
        loading={placing}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  red: { color: colors.red },
  error: { color: colors.redBright },
  notice: { color: colors.yellow },
  options: { gap: space.sm },
  option: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: space.md, gap: 2 },
  optionActive: { borderColor: colors.red, backgroundColor: colors.card2 },
  note: { textTransform: 'none', color: colors.orange, lineHeight: 16 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  lineName: { flex: 1 },
});
