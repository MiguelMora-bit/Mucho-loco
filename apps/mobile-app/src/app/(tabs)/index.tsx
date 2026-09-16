import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { formatPrice, resolveMembershipTierPrice } from '@mucho-loco/customer-core/pricing';
import { Body, Button, Card, Display, ErrorState, Heading, Loading, Mono, Screen } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { announcementRepository, branchRepository, membershipRepository } from '@/lib/repositories';
import { useResource } from '@/lib/use-resource';
import { colors, fonts, space } from '@/theme';

export default function HomeScreen() {
  const { t, m, lang } = useT();
  const router = useRouter();

  const loadAnnouncements = useCallback(() => announcementRepository.getAll(), []);
  const announcements = useResource(loadAnnouncements);

  // "Desde": el precio mensual más bajo de la cadena. El precio real depende
  // de la sucursal (ver pestaña Sucursales) — `branchPriceNote` lo aclara.
  const loadMemberships = useCallback(async () => {
    const [tiers, branches] = await Promise.all([membershipRepository.getTiers(), branchRepository.getAll()]);
    return { tiers, fromPrice: Math.min(...branches.map((b) => b.price)) };
  }, []);
  const memberships = useResource(loadMemberships);
  // Fuera del JSX: dentro del callback de `map`, TypeScript ya no recuerda que
  // `status === 'ready'` se comprobó afuera.
  const fromPrice = memberships.state.status === 'ready' ? memberships.state.data.fromPrice : 0;

  return (
    <Screen>
      <View style={styles.hero}>
        <Image source={require('@/assets/images/bull-head.png')} style={styles.bull} contentFit="contain" />
        <Mono style={styles.live}>{t.hero.live}</Mono>
        <View>
          <Display style={styles.heroTitle}>{t.hero.titleA}</Display>
          <Display style={[styles.heroTitle, styles.red]}>{t.hero.titleB}</Display>
          <Display style={styles.heroTitle}>{t.hero.titleC}</Display>
        </View>
        <Body>{t.hero.lead}</Body>
        <Button title={t.hero.ctaJoin} onPress={() => router.push('/account')} />
        <Button title={m.home.goShop} variant="outline" onPress={() => router.push('/shop')} />
      </View>

      <View style={styles.stats}>
        {t.stats.map((s) => (
          <Card key={s.l} style={styles.stat}>
            <Display style={styles.statNum}>{s.n}</Display>
            <Mono>{s.l}</Mono>
          </Card>
        ))}
      </View>

      <Heading>{m.home.announcements}</Heading>
      {announcements.state.status === 'loading' && <Loading />}
      {announcements.state.status === 'error' && (
        <ErrorState message={t.common.connectionError} retryLabel={t.error.retry} onRetry={announcements.reload} />
      )}
      {announcements.state.status === 'ready' &&
        (announcements.state.data.length === 0 ? (
          <Body>{t.announcements.empty}</Body>
        ) : (
          announcements.state.data.map((a) => (
            <Card key={a.id} style={[styles.announcement, { borderLeftColor: a.accent }]}>
              <Mono style={{ color: a.accent }}>
                {a.emoji} {a.badge[lang]} · {a.dateLabel[lang]}
              </Mono>
              <Heading>{a.title[lang]}</Heading>
              <Body>{a.subtitle[lang]}</Body>
              <Mono>{a.location[lang]}</Mono>
            </Card>
          ))
        ))}

      <View>
        <Mono style={styles.red}>{t.memberships.eyebrow}</Mono>
        <Display>
          {t.memberships.titleA} <Display style={styles.red}>{t.memberships.titleB}</Display>
        </Display>
      </View>
      <Body>{t.memberships.sub}</Body>
      {memberships.state.status === 'loading' && <Loading />}
      {memberships.state.status === 'error' && (
        <ErrorState message={t.common.connectionError} retryLabel={t.error.retry} onRetry={memberships.reload} />
      )}
      {memberships.state.status === 'ready' &&
        memberships.state.data.tiers.map((tier) => (
          <Card key={tier.key} style={tier.popular && styles.popular}>
            {tier.popular && <Mono style={styles.red}>🔥 {t.memberships.popular}</Mono>}
            <Heading>{tier.name[lang]}</Heading>
            <Mono>{tier.badge[lang]}</Mono>
            <Body>
              {t.branches.price}{' '}
              <Display style={styles.price}>
                {formatPrice(resolveMembershipTierPrice(tier, fromPrice, 1))}
              </Display>{' '}
              {m.branches.perMonth}
            </Body>
            {tier.perks[lang].map((perk) => (
              <Body key={perk}>✓ {perk}</Body>
            ))}
          </Card>
        ))}
      <Mono>{t.memberships.branchPriceNote}</Mono>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.md, paddingTop: space.md },
  bull: { width: 96, height: 96 },
  live: { color: colors.orange },
  heroTitle: { fontSize: 52, lineHeight: 56 },
  red: { color: colors.red },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stat: { width: '48%', flexGrow: 1 },
  statNum: { fontSize: 36, lineHeight: 40 },
  announcement: { borderLeftWidth: 4 },
  popular: { borderColor: colors.red },
  price: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, color: colors.cream },
});
