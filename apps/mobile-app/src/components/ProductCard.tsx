import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Lang, Product } from '@mucho-loco/types';
import { formatPrice } from '@mucho-loco/customer-core/pricing';
import { imageSource } from '@/lib/images';
import { colors, fonts, space } from '@/theme';

interface ProductCardProps {
  product: Product;
  lang: Lang;
  qtyInCart: number;
  addLabel: string;
  onAdd: () => void;
  onOpen: () => void;
}

export function ProductCard({ product, lang, qtyInCart, addLabel, onAdd, onOpen }: ProductCardProps) {
  const name = product.name[lang];
  return (
    <Pressable onPress={onOpen} accessibilityRole="link" accessibilityLabel={name} style={styles.card}>
      <View>
        <Image source={imageSource(product.img)} style={styles.img} contentFit="cover" transition={150} />
        {product.tag && <Text style={styles.tag}>{product.tag}</Text>}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        <Text style={styles.flav} numberOfLines={1}>
          {product.flav[lang]}
        </Text>
        <View style={styles.row}>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
          {/* Un Pressable dentro de otro: el toque lo toma el más interno, así que
              agregar no abre el detalle (el equivalente a stopPropagation de la web). */}
          <Pressable
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel={`${addLabel}: ${name}`}
            style={[styles.add, qtyInCart > 0 && styles.added]}
          >
            <Text style={styles.addText}>{qtyInCart > 0 ? `× ${qtyInCart}` : '+'}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: '48%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  img: { width: '100%', aspectRatio: 1, backgroundColor: colors.card2 },
  tag: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
    backgroundColor: colors.red,
    color: colors.cream,
    fontFamily: fonts.bebas,
    fontSize: 13,
    letterSpacing: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    textTransform: 'uppercase',
  },
  body: { padding: space.sm, gap: 2, flex: 1 },
  name: { fontFamily: fonts.bebas, color: colors.cream, fontSize: 18, letterSpacing: 0.5 },
  flav: { fontFamily: fonts.body, color: colors.creamDim, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  price: { fontFamily: fonts.display, color: colors.red, fontSize: 20 },
  add: { minWidth: 40, height: 36, paddingHorizontal: space.sm, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  added: { backgroundColor: colors.redDeep },
  addText: { fontFamily: fonts.bebas, color: colors.cream, fontSize: 18 },
});
