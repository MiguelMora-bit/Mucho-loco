import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Button, Display, ErrorState, Loading, Mono } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { userRepository } from '@/lib/repositories';
import { useSessionStore } from '@/lib/stores/session.store';
import { useMaxBrightness } from '@/lib/use-max-brightness';
import { useResource } from '@/lib/use-resource';
import { colors, space } from '@/theme';

/**
 * QR de acceso a pantalla completa. Es EXACTAMENTE el mismo código que pinta
 * `QrModal` en la web (`membership.accessCode`) y el mismo que escanea y
 * valida branch-app — ver "QR de acceso" en el CLAUDE.md raíz. Fijo mientras
 * la membresía esté vigente: no rota, así que también funciona sin red una
 * vez cargado.
 *
 * El código se lee del repositorio y no viaja como parámetro de la ruta: una
 * URL (deep link) la puede fabricar cualquiera.
 */
export default function QrScreen() {
  const { t } = useT();
  const router = useRouter();
  const email = useSessionStore((s) => s.session?.email);
  useMaxBrightness();

  const load = useCallback(
    () => (email ? userRepository.getMembership(email) : Promise.resolve(null)),
    [email],
  );
  const { state, reload } = useResource(load);

  return (
    <SafeAreaView style={styles.screen}>
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && (
        <ErrorState message={t.common.connectionError} retryLabel={t.error.retry} onRetry={reload} />
      )}
      {state.status === 'ready' && state.data && (
        <View style={styles.content}>
          <View style={styles.qrCard} accessibilityLabel={state.data.accessCode}>
            <QRCode value={state.data.accessCode} size={240} ecl="M" color="#000000" backgroundColor="#ffffff" />
            <Mono style={styles.code}>{state.data.accessCode}</Mono>
          </View>
          <Display style={styles.title}>{t.dashboard.qr.title}</Display>
          <Body style={styles.center}>{t.dashboard.qr.sub}</Body>
        </View>
      )}
      {/* Sin membresía no hay QR: el código nace con la primera compra. */}
      {state.status === 'ready' && !state.data && (
        <Body style={styles.center}>{t.dashboard.access.noMembershipNote}</Body>
      )}
      <Button title={t.dashboard.qr.close} variant="outline" onPress={() => router.back()} style={styles.close} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black, padding: space.lg, justifyContent: 'center' },
  content: { alignItems: 'center', gap: space.md },
  qrCard: { backgroundColor: '#ffffff', padding: space.lg, alignItems: 'center', gap: space.sm },
  code: { color: colors.muted, fontSize: 9 },
  title: { fontSize: 44, lineHeight: 48, textAlign: 'center' },
  center: { textAlign: 'center' },
  close: { marginTop: space.xl },
});
