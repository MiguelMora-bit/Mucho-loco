import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ProductCat } from '@mucho-loco/types';
import { PRODUCT_CATS } from '@mucho-loco/customer-core/data';
import { formatPrice } from '@mucho-loco/customer-core/pricing';
import { ProductCard } from '@/components/ProductCard';
import { Body, Chip, Display, ErrorState, Loading, Mono, Screen } from '@/components/ui';
import { cartCount, cartSubtotal } from '@/lib/cart';
import { useT } from '@/lib/i18n';
import { productRepository } from '@/lib/repositories';
import { useCartStore } from '@/lib/stores/cart.store';
import { useResource } from '@/lib/use-resource';
import { colors, fonts, space } from '@/theme';

type CatKey = 'all' | ProductCat;

export default function ShopScreen() {
  const { t, m, lang } = useT();
  const router = useRouter();
  const [cat, setCat] = useState<CatKey>('all');
  const items = useCartStore((s) => s.items);
  const add = useCartStore((s) => s.add);

  const load = useCallback(() => productRepository.getAll(), []);
  const { state, reload } = useResource(load);

  const cats = Object.entries(PRODUCT_CATS[lang]) as [CatKey, string][];
  const count = cartCount(items);

  return (
    <View style={styles.fill}>
      <Screen>
        <View>
          <Mono style={styles.red}>{t.shop.eyebrow}</Mono>
          <Display>
            {t.shop.titleA} <Display style={styles.red}>{t.shop.titleB}</Display>
          </Display>
        </View>
        <Body>{t.shop.sub}</Body>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {cats.map(([key, label]) => (
            <Chip key={key} label={label} active={cat === key} onPress={() => setCat(key)} />
          ))}
        </ScrollView>

        {state.status === 'loading' && <Loading />}
        {state.status === 'error' && (
          <ErrorState message={t.common.connectionError} retryLabel={t.error.retry} onRetry={reload} />
        )}
        {state.status === 'ready' && (
          <View style={styles.grid}>
            {state.data
              .filter((p) => cat === 'all' || p.cat === cat)
              .map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  lang={lang}
                  qtyInCart={items.find((i) => i.id === p.id)?.qty ?? 0}
                  addLabel={t.shop.add}
                  onAdd={() => add(p)}
                  onOpen={() => router.push({ pathname: '/product/[id]', params: { id: p.id } })}
                />
              ))}
          </View>
        )}
      </Screen>

      {count > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={m.cart.view}
          onPress={() => router.push('/cart')}
          style={({ pressed }) => [styles.cartBar, pressed && styles.pressed]}
        >
          <Text style={styles.cartBarText}>
            {m.cart.view} · {count} {m.cart.items}
          </Text>
          <Text style={styles.cartBarText}>{formatPrice(cartSubtotal(items))}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.black },
  red: { color: colors.red },
  chips: { gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md },
  cartBar: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: space.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.red,
    paddingHorizontal: space.md,
    paddingVertical: 14,
  },
  cartBarText: { fontFamily: fonts.bebas, color: colors.cream, fontSize: 18, letterSpacing: 1 },
  pressed: { opacity: 0.85 },
});
