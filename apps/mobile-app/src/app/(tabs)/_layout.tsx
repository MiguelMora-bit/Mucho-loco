import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { cartCount } from '@/lib/cart';
import { useT } from '@/lib/i18n';
import { useCartStore } from '@/lib/stores/cart.store';
import { colors, fonts } from '@/theme';

/**
 * Las 4 pestañas. `(tabs)` entre paréntesis es un grupo: organiza archivos
 * sin aparecer en la URL (igual que los route groups de Next) — la tienda es
 * `/shop`, no `/(tabs)/shop`.
 *
 * `Tabs` (JS) y no `NativeTabs`: la API nativa sigue marcada como inestable en
 * expo-router y en web pide una implementación aparte. Con esta, un solo
 * código corre en iOS, Android y web.
 */
export default function TabsLayout() {
  const { m } = useT();
  const count = useCartStore((s) => cartCount(s.items));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.creamDim,
        tabBarStyle: { backgroundColor: colors.black2, borderTopColor: colors.border },
        // Bebas es alta para su tamaño: a 14px la etiqueta no cabe en la altura
        // default de la barra y sale cortada por abajo. lineHeight fijo la contiene.
        tabBarLabelStyle: { fontFamily: fonts.bebas, fontSize: 12, lineHeight: 14, letterSpacing: 1 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: m.tabs.home,
          tabBarIcon: ({ color, size }) => <Ionicons name="flame" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: m.tabs.shop,
          tabBarBadge: count > 0 ? count : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.red, color: colors.cream },
          tabBarIcon: ({ color, size }) => <Ionicons name="bag-handle" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="branches"
        options={{
          title: m.tabs.branches,
          tabBarIcon: ({ color, size }) => <Ionicons name="location" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: m.tabs.account,
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
