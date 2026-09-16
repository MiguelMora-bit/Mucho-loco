import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { MembershipPlanChoice, PlanKey } from '@mucho-loco/types';
import { formatPrice, PERIOD_MULTIPLIERS, resolveMembershipTierPrice } from '@mucho-loco/customer-core/pricing';
import { formatDate } from '@mucho-loco/customer-core/dates';
import { membershipErrorCode } from '@mucho-loco/customer-core/membership-errors';
import { purchaseBlock, renewalStartsOn } from '@mucho-loco/customer-core/membership-rules';
import { Body, Button, Card, Chip, Display, ErrorState, Heading, Loading, Mono, Screen } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { branchRepository, membershipRepository, paymentRepository, userRepository } from '@/lib/repositories';
import { useSessionStore } from '@/lib/stores/session.store';
import { useResource } from '@/lib/use-resource';
import { colors, space } from '@/theme';

const PERIODS: PlanKey[] = ['visit', 'weekly', 'monthly', 'quarterly', 'annual'];

/**
 * Contratar o renovar la membresía — la misma pantalla que `/membership` de la
 * web, con componentes nativos. El pago va igual que el del checkout: Stripe
 * en un navegador dentro de la app, de regreso por deep link. La membresía NO
 * se activa al volver: la activa el webhook en el backend, y el panel la
 * recarga al recibir el foco.
 */
export default function MembershipScreen() {
  const { t, lang } = useT();
  const router = useRouter();
  const email = useSessionStore((s) => s.session?.email);
  const copy = t.membershipCheckout;

  const load = useCallback(async () => {
    const [branches, tiers, membership] = await Promise.all([
      branchRepository.getAll(),
      membershipRepository.getTiers(),
      email ? userRepository.getMembership(email) : Promise.resolve(null),
    ]);
    // Lo ya pagado (en mostrador, por ejemplo) no se pierde por renovar antes:
    // el primer cobro cae cuando se acaba. Se calcula aquí y no al pintar:
    // depende de "ahora", y el render tiene que ser puro.
    return { branches, tiers, membership, carryOverUntil: renewalStartsOn(membership) };
  }, [email]);
  const { state, reload } = useResource(load);

  const [choice, setChoice] = useState<Partial<MembershipPlanChoice>>({});
  const [paying, setPaying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (state.status === 'loading') {
    return (
      <Screen safeTop={false}>
        <Loading />
      </Screen>
    );
  }
  if (state.status === 'error') {
    return (
      <Screen safeTop={false}>
        <ErrorState message={t.common.connectionError} retryLabel={t.error.retry} onRetry={reload} />
      </Screen>
    );
  }

  const { branches, tiers, membership, carryOverUntil } = state.data;
  // Renovar arranca de lo que ya tiene: su sucursal y su alcance.
  const home = membership
    ? branches.find((b) => b.name.toLowerCase() === membership.branch.toLowerCase())
    : undefined;
  const plan: MembershipPlanChoice = {
    branchId: choice.branchId ?? home?.id ?? branches[0].id,
    tierKey: choice.tierKey ?? membership?.tierKey ?? 'all',
    periodKey: choice.periodKey ?? 'monthly',
  };
  const branch = branches.find((b) => b.id === plan.branchId) ?? branches[0];
  const tier = tiers.find((x) => x.key === plan.tierKey);
  const price = resolveMembershipTierPrice(tier ?? { factor: 1 }, branch.price, PERIOD_MULTIPLIERS[plan.periodKey]);
  const recurring = plan.periodKey !== 'visit';

  // Las mismas reglas que aplica el backend, solo para no ofrecer un botón que va a rebotar.
  const block = purchaseBlock(membership, plan.periodKey);
  const blockedReason =
    block === 'ALREADY_SUBSCRIBED' ? copy.alreadySubscribed : block === 'MEMBERSHIP_STILL_ACTIVE' ? copy.stillActive : null;
  const carryOver = recurring && carryOverUntil !== null;

  function choose<K extends keyof MembershipPlanChoice>(key: K, value: MembershipPlanChoice[K]) {
    setChoice((current) => ({ ...current, [key]: value }));
    setNotice(null);
  }

  async function pay() {
    if (!email) return;
    setPaying(true);
    setNotice(null);
    try {
      const returnBase = Linking.createURL('/membership');
      const successUrl = Linking.createURL('/membership', { queryParams: { paid: '1' } });
      const { url } = await paymentRepository.createMembershipCheckout(email, plan, lang, successUrl, returnBase);
      // El mock no tiene pasarela: responde directo con la URL de éxito.
      if (!url.startsWith(returnBase)) {
        const result = await WebBrowser.openAuthSessionAsync(url, returnBase);
        if (result.type !== 'success' || !result.url.includes('paid=1')) {
          setNotice(copy.cancelled);
          return;
        }
      }
      router.back();
    } catch (e) {
      const code = membershipErrorCode(e);
      setNotice(
        code === 'ALREADY_SUBSCRIBED'
          ? copy.alreadySubscribed
          : code === 'MEMBERSHIP_STILL_ACTIVE'
            ? copy.stillActive
            : copy.error,
      );
    } finally {
      setPaying(false);
    }
  }

  const message = blockedReason ?? notice;

  return (
    <Screen safeTop={false}>
      <Mono style={styles.red}>{copy.eyebrow}</Mono>
      <Display>{copy.title}</Display>
      <Body>{copy.sub}</Body>

      <Heading>{copy.branchLabel}</Heading>
      <View style={styles.chips}>
        {branches.map((b) => (
          <Chip key={b.id} label={b.name} active={plan.branchId === b.id} onPress={() => choose('branchId', b.id)} />
        ))}
      </View>
      <Body>{plan.tierKey === 'single' ? copy.branchNoteSingle : copy.branchNoteAll}</Body>

      <Heading>{copy.tierLabel}</Heading>
      <View style={styles.chips}>
        {tiers.map((x) => (
          <Chip key={x.key} label={x.name[lang]} active={plan.tierKey === x.key} onPress={() => choose('tierKey', x.key)} />
        ))}
      </View>

      <Heading>{copy.periodLabel}</Heading>
      <View style={styles.chips}>
        {PERIODS.map((p) => (
          <Chip key={p} label={t.memberships[p]} active={plan.periodKey === p} onPress={() => choose('periodKey', p)} />
        ))}
      </View>

      <Card style={styles.total}>
        <Mono>{copy.totalLabel}</Mono>
        <Display>
          {formatPrice(price)} <Mono>MXN {copy.periodSuffix[plan.periodKey]}</Mono>
        </Display>
        <Body>{recurring ? copy.recurringNote : copy.oneTimeNote}</Body>
        {carryOver && carryOverUntil && (
          <Body style={styles.cream}>
            {copy.carryOverPrefix} {formatDate(carryOverUntil, lang)} {copy.carryOverSuffix}
          </Body>
        )}
        {message && <Body style={styles.error}>{message}</Body>}
        <Button
          title={paying ? copy.paying : copy.pay}
          onPress={pay}
          loading={paying}
          disabled={blockedReason !== null || !email}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  red: { color: colors.red },
  cream: { color: colors.cream },
  error: { color: colors.redBright },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  total: { borderColor: colors.red, gap: space.sm },
});
