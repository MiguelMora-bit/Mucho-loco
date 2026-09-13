import { Image } from 'expo-image';
import { useCallback } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import type { Branch } from '@mucho-loco/types';
import { formatPrice } from '@mucho-loco/customer-core/pricing';
import { Body, Button, Card, Display, ErrorState, Heading, Loading, Mono, Screen } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { imageSource } from '@/lib/images';
import { branchRepository } from '@/lib/repositories';
import { useResource } from '@/lib/use-resource';
import { colors, space } from '@/theme';

/**
 * "Cómo llegar" abre la app de mapas del teléfono en vez de pintar un mapa
 * dentro de la app: en móvil es lo que el socio quiere (navegación paso a
 * paso), y no necesita llave de Google Maps. El mapa con pines
 * (react-native-maps) queda para después — ver CLAUDE.md del app.
 */
function directionsUrl(b: Branch): string {
  const dest = `${b.lat},${b.lng}`;
  return Platform.OS === 'ios'
    ? `https://maps.apple.com/?daddr=${dest}`
    : `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
}

export default function BranchesScreen() {
  const { t, m, lang } = useT();
  const load = useCallback(() => branchRepository.getAll(), []);
  const { state, reload } = useResource(load);

  return (
    <Screen>
      <View>
        <Mono style={styles.red}>{t.branches.eyebrow}</Mono>
        <Display>
          {t.branches.titleA} <Display style={styles.red}>{t.branches.titleB}</Display>
        </Display>
      </View>
      <Body>{t.branches.quote}</Body>

      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && (
        <ErrorState message={t.common.connectionError} retryLabel={t.error.retry} onRetry={reload} />
      )}
      {state.status === 'ready' &&
        state.data.map((b) => (
          <Card key={b.id} style={styles.card}>
            <Image source={imageSource(b.img)} style={styles.img} contentFit="cover" transition={150} />
            <View style={styles.body}>
              <Mono>
                {b.city} · {b.tier}
              </Mono>
              <Heading>{b.name}</Heading>
              <Body>{b.addr}</Body>
              <Mono>
                {t.branches.hours}: {b.hours} · {b.classes} {t.branches.classes} · {b.coaches} {t.branches.coaches}
              </Mono>
              <Body>
                {t.branches.price} <Heading style={styles.price}>{formatPrice(b.price)}</Heading> {m.branches.perMonth}
              </Body>
              {b.promo && (
                <View style={styles.promo}>
                  <Mono style={styles.promoText}>
                    {t.branches.promoBadge} · {b.promo.label[lang]}
                  </Mono>
                  <Body>{b.promo.detail[lang]}</Body>
                </View>
              )}
              <View style={styles.actions}>
                <Button
                  title={m.branches.directions}
                  onPress={() => Linking.openURL(directionsUrl(b))}
                  style={styles.action}
                />
                <Button
                  title={m.branches.call}
                  variant="outline"
                  onPress={() => Linking.openURL(`tel:${b.phone.replace(/\s+/g, '')}`)}
                  style={styles.action}
                />
              </View>
            </View>
          </Card>
        ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  red: { color: colors.red },
  card: { padding: 0, gap: 0 },
  img: { width: '100%', height: 160, backgroundColor: colors.card2 },
  body: { padding: space.md, gap: space.xs },
  price: { color: colors.red },
  promo: { borderLeftWidth: 3, borderLeftColor: colors.yellow, paddingLeft: space.sm, marginTop: space.xs },
  promoText: { color: colors.yellow },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  action: { flex: 1, paddingHorizontal: space.sm },
});
