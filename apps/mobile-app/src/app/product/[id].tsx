import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatPrice } from '@mucho-loco/customer-core/pricing';
import { Body, Button, Display, ErrorState, Heading, Loading, Mono, Screen } from '@/components/ui';
import { cartCount } from '@/lib/cart';
import { useT } from '@/lib/i18n';
import { imageSource } from '@/lib/images';
import { productRepository } from '@/lib/repositories';
import { useCartStore } from '@/lib/stores/cart.store';
import { useResource } from '@/lib/use-resource';
import { colors, fonts, space } from '@/theme';

/** `[id]` en el nombre del archivo = segmento dinámico, igual que `product/[id]` en Next. */
export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useT();
  const router = useRouter();
  const add = useCartStore((s) => s.add);
  const count = useCartStore((s) => cartCount(s.items));
  const [justAdded, setJustAdded] = useState(false);

  const load = useCallback(async () => {
    const product = await productRepository.getById(id);
    const siblings = product ? await productRepository.getSiblings(product.id, product.cat) : [];
    return { product, siblings };
  }, [id]);
  const { state, reload } = useResource(load);

  useEffect(() => {
    if (!justAdded) return;
    const timer = setTimeout(() => setJustAdded(false), 1500);
    return () => clearTimeout(timer);
  }, [justAdded]);

  return (
    <>
      {/* Opciones del header declaradas desde la propia pantalla. */}
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.cart.title}
              onPress={() => router.push('/cart')}
              style={styles.cartButton}
            >
              <Ionicons name="bag-handle" size={22} color={colors.cream} />
              {count > 0 && <Text style={styles.cartCount}>{count}</Text>}
            </Pressable>
          ),
        }}
      />
      <Screen safeTop={false}>
        {state.status === 'loading' && <Loading />}
        {state.status === 'error' && (
          <ErrorState message={t.common.connectionError} retryLabel={t.error.retry} onRetry={reload} />
        )}
        {state.status === 'ready' && !state.data.product && (
          <>
            <Heading>{t.product.notFound}</Heading>
            <Button title={t.product.backToShop} onPress={() => router.back()} />
          </>
        )}
        {state.status === 'ready' && state.data.product && (
          <>
            <Image source={imageSource(state.data.product.img)} style={styles.img} contentFit="cover" />
            <View>
              <Display>{state.data.product.name[lang]}</Display>
              <Body>{state.data.product.flav[lang]}</Body>
            </View>
            <Display style={styles.price}>{formatPrice(state.data.product.price)} MXN</Display>
            <Button
              title={justAdded ? `✓ ${t.product.addedToBag}` : t.product.addToBag}
              onPress={() => {
                if (state.data.product) add(state.data.product);
                setJustAdded(true);
              }}
            />
            <View style={styles.perks}>
              <Mono>✓ {t.product.branchPickup}</Mono>
              <Mono>✓ {t.product.homeDelivery}</Mono>
              <Mono>✓ {t.product.securePayment}</Mono>
            </View>

            {state.data.siblings.length > 0 && (
              <>
                <Heading>
                  {t.product.moreFrom} {t.product.theCategory}
                </Heading>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.siblings}>
                  {state.data.siblings.map((p) => (
                    <Pressable
                      key={p.id}
                      accessibilityRole="link"
                      accessibilityLabel={p.name[lang]}
                      onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.id } })}
                      style={styles.sibling}
                    >
                      <Image source={imageSource(p.img)} style={styles.siblingImg} contentFit="cover" />
                      <Text style={styles.siblingName} numberOfLines={1}>
                        {p.name[lang]}
                      </Text>
                      <Text style={styles.siblingPrice}>{formatPrice(p.price)}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  img: { width: '100%', aspectRatio: 1, backgroundColor: colors.card2 },
  price: { color: colors.red },
  perks: { gap: space.xs },
  siblings: { gap: space.sm },
  sibling: { width: 140, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  siblingImg: { width: '100%', aspectRatio: 1 },
  siblingName: { fontFamily: fonts.bebas, color: colors.cream, fontSize: 16, paddingHorizontal: space.sm, paddingTop: space.xs },
  siblingPrice: { fontFamily: fonts.display, color: colors.red, fontSize: 16, padding: space.sm, paddingTop: 0 },
  cartButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.sm },
  cartCount: { fontFamily: fonts.bebas, color: colors.cream, fontSize: 16 },
});
