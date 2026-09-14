import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { PlanKey, TierKey } from '@mucho-loco/types';
import { renewalStartsOn } from '@mucho-loco/customer-core/membership-rules';
import { branchRepository } from '@/lib/repositories/branch.repository';
import { membershipRepository } from '@/lib/repositories/membership.repository';
import { userRepository } from '@/lib/repositories/user.repository';
import MembershipCheckoutClient from '@/components/MembershipCheckoutClient';
import { buildAlternates } from '@/lib/seo';
import { getCurrentUserEmail } from '@/lib/session';
import { redirect } from '@/i18n/routing';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string; period?: string; branch?: string; cancelled?: string }>;
}

const TIERS: TierKey[] = ['single', 'all'];
const PERIODS: PlanKey[] = ['visit', 'weekly', 'monthly', 'quarterly', 'annual'];

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: t('panelTitle'),
    description: t('panelDesc'),
    alternates: buildAlternates('/membership', locale),
    robots: { index: false, follow: false },
  };
}

/**
 * Contratar o renovar la membresía. Llega aquí desde el landing (con el plan
 * que eligió en la query) o desde el panel. La query se valida contra listas
 * cerradas: viene de una URL, que puede traer cualquier cosa.
 */
export default async function MembershipPage(props: Props) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const email = await getCurrentUserEmail();
  if (!email) {
    return redirect({ href: '/account', locale });
  }
  const query = await props.searchParams;
  const [branches, tiers, membership] = await Promise.all([
    branchRepository.getAll(),
    membershipRepository.getTiers(),
    userRepository.getMembership(email),
  ]);

  // Renovar arranca de lo que ya tiene: su sucursal y su alcance.
  const home = membership
    ? branches.find((b) => b.name.toLowerCase() === membership.branch.toLowerCase())
    : undefined;
  const requested = branches.find((b) => String(b.id) === query.branch);

  return (
    <MembershipCheckoutClient
      branches={branches}
      tiers={tiers}
      membership={membership}
      initial={{
        branchId: (requested ?? home ?? branches[0]).id,
        tierKey: TIERS.find((k) => k === query.plan) ?? membership?.tierKey ?? 'all',
        periodKey: PERIODS.find((k) => k === query.period) ?? 'monthly',
      }}
      // Lo ya pagado (en mostrador, por ejemplo) no se pierde por renovar
      // antes. Aquí y no en el cliente: depende de "ahora".
      carryOverUntil={renewalStartsOn(membership)}
      cancelled={query.cancelled === '1'}
    />
  );
}
