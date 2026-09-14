import { Anton_400Regular } from '@expo-google-fonts/anton';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useT } from '@/lib/i18n';
import { useSessionStore } from '@/lib/stores/session.store';
import { colors, fonts } from '@/theme';

// El splash nativo se queda hasta que haya fuentes y se sepa si hay sesión:
// sin esto se vería un instante texto con la fuente del sistema y el login.
SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.red,
    background: colors.black,
    card: colors.black2,
    text: colors.cream,
    border: colors.border,
    notification: colors.red,
  },
};

/**
 * Layout raíz — el `app/layout.tsx` de Next, con la misma idea de rutas por
 * archivo. La diferencia es que aquí el layout es un navegador: un Stack
 * (pantallas que se apilan, con "atrás") que contiene las pestañas y encima
 * las pantallas de detalle y los modales.
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Anton_400Regular,
    BebasNeue_400Regular,
    Inter_400Regular,
    Inter_700Bold,
    JetBrainsMono_400Regular,
  });
  const status = useSessionStore((s) => s.status);
  const restore = useSessionStore((s) => s.restore);
  const { t } = useT();

  useEffect(() => {
    restore();
  }, [restore]);

  // Si una fuente falla se sigue con la del sistema: mejor fea que trabada en el splash.
  const ready = (fontsLoaded || !!fontError) && status !== 'restoring';

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.black2 },
          headerTintColor: colors.cream,
          headerTitleStyle: { fontFamily: fonts.bebas, fontSize: 22 },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.black },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: t.product.store }} />
        <Stack.Screen name="cart" options={{ title: t.cart.title, presentation: 'modal' }} />
        <Stack.Screen name="checkout" options={{ title: t.checkout.payment.title }} />
        <Stack.Screen name="login" options={{ title: t.account.loginTab, presentation: 'modal' }} />
        <Stack.Screen name="qr" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="order/[id]" options={{ title: t.dashboard.nav.orders, presentation: 'modal' }} />
        <Stack.Screen name="community" options={{ title: t.dashboard.community.title }} />
        <Stack.Screen name="performance" options={{ title: t.dashboard.nav.performance }} />
        <Stack.Screen name="membership" options={{ title: t.membershipCheckout.eyebrow }} />
      </Stack>
    </ThemeProvider>
  );
}
