import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { OnlinePaymentMethod, OrderDelivery, ShippingAddress, Translations } from '@mucho-loco/types';
import { formatPrice } from '@mucho-loco/customer-core/pricing';
import { EMPTY_SHIPPING_ADDRESS, parseShippingAddress, type ShippingAddressField } from '@mucho-loco/customer-core/shipping';
import { Field } from '@/components/Field';
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
  const [address, setAddress] = useState<ShippingAddress>(EMPTY_SHIPPING_ADDRESS);
  const [invalidFields, setInvalidFields] = useState<ShippingAddressField[]>([]);
  const setAddressField = (field: ShippingAddressField, value: string) =>
    setAddress((current) => ({ ...current, [field]: value }));

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
    // A domicilio, la dirección se valida aquí (mismas reglas que el backend)
    // para marcar el error sin ir al servidor; el backend la vuelve a validar.
    let orderDelivery: OrderDelivery = { method: 'pickup' };
    if (delivery === 'home') {
      const parsed = parseShippingAddress(address);
      setInvalidFields(parsed.invalid);
      if (parsed.invalid.length > 0) return;
      orderDelivery = { method: 'home', address: parsed.address };
    }
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
          orderDelivery,
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
        // Sin pasarela solo hay efectivo al recoger: queda pendiente y lo
        // cobra mostrador al entregarlo.
        await userRepository.createOrder(session.email, lines, 'cash', orderDelivery, lang);
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
  const p = t.checkout.payment;

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

      {delivery === 'home' && (
        <View style={styles.address}>
          <Heading>{p.shippingAddress}</Heading>
          <Field
            label={p.streetLabel}
            value={address.street}
            onChangeText={(v) => setAddressField('street', v)}
            placeholder="Av. Insurgentes Sur 1234, int. 5"
            autoComplete="address-line1"
            textContentType="streetAddressLine1"
          />
          <Field
            label={p.neighborhoodLabel}
            value={address.neighborhood}
            onChangeText={(v) => setAddressField('neighborhood', v)}
            placeholder="Roma Sur"
          />
          <Field
            label={p.cityLabel}
            value={address.city}
            onChangeText={(v) => setAddressField('city', v)}
            placeholder="Cuauhtémoc"
            textContentType="addressCity"
          />
          <Field
            label={p.stateLabel}
            value={address.state}
            onChangeText={(v) => setAddressField('state', v)}
            placeholder="CDMX"
            textContentType="addressState"
          />
          <Field
            label={p.zipLabel}
            value={address.postalCode}
            onChangeText={(v) => setAddressField('postalCode', v)}
            placeholder="06760"
            keyboardType="number-pad"
            maxLength={5}
            autoComplete="postal-code"
            textContentType="postalCode"
          />
          <Field
            label={p.phoneLabel}
            value={address.phone}
            onChangeText={(v) => setAddressField('phone', v)}
            placeholder="55 1234 5678"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
          />
          <Field
            label={p.referencesLabel}
            value={address.references ?? ''}
            onChangeText={(v) => setAddressField('references', v)}
            placeholder="Entre Medellín y Monterrey, portón negro"
          />
          {invalidFields.length > 0 && <Body style={styles.error}>{p.addressInvalid}</Body>}
        </View>
      )}

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
  address: { gap: space.sm },
});
