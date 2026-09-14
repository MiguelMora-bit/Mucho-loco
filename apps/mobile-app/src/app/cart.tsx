import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatPrice } from '@mucho-loco/customer-core/pricing';
import { Body, Button, Card, Display, Heading, Screen } from '@/components/ui';
import { cartSubtotal } from '@/lib/cart';
import { useT } from '@/lib/i18n';
import { imageSource } from '@/lib/images';
import { useCartStore } from '@/lib/stores/cart.store';
import { colors, fonts, space } from '@/theme';

/** Modal del carrito — el `CartDrawer` de la web. */
export default function CartScreen() {
  const { t, lang } = useT();
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const changeQty = useCartStore((s) => s.changeQty);

  if (items.length === 0) {
    return (
      <Screen safeTop={false}>
        <Body>{t.cart.empty}</Body>
        <Button title={t.cart.continue} variant="outline" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen safeTop={false}>
      {items.map((item) => {
        const name = item.name[lang];
        return (
          <Card key={item.id} style={styles.item}>
            <Image source={imageSource(item.img)} style={styles.img} contentFit="cover" />
            <View style={styles.info}>
              <Heading style={styles.name}>{name}</Heading>
              <Body>{item.flav[lang]}</Body>
              <Text style={styles.price}>{formatPrice(item.price * item.qty)}</Text>
            </View>
            <View style={styles.qty}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`− ${name}`}
                onPress={() => changeQty(item.id, -1)}
                style={styles.qtyButton}
              >
                <Text style={styles.qtyText}>−</Text>
              </Pressable>
              <Text style={styles.qtyText}>{item.qty}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`+ ${name}`}
                onPress={() => changeQty(item.id, 1)}
                style={styles.qtyButton}
              >
                <Text style={styles.qtyText}>+</Text>
              </Pressable>
            </View>
          </Card>
        );
      })}

      <View style={styles.subtotal}>
        <Heading>{t.cart.subtotal}</Heading>
        <Display style={styles.total}>{formatPrice(cartSubtotal(items))}</Display>
      </View>
      {/* replace y no push: el checkout ocupa el lugar del modal en vez de abrirse encima de él. */}
      <Button title={t.cart.checkout} onPress={() => router.replace('/checkout')} />
      <Button title={t.cart.continue} variant="outline" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  img: { width: 64, height: 64, backgroundColor: colors.card2 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 18 },
  price: { fontFamily: fonts.display, color: colors.red, fontSize: 18 },
  qty: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  qtyButton: { width: 32, height: 32, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontFamily: fonts.bebas, color: colors.cream, fontSize: 20 },
  subtotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontSize: 32, lineHeight: 36 },
});
