'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import type { Branch, Lang, MembershipInfo, MembershipPlanChoice, MembershipTier, PlanKey } from '@mucho-loco/types';
import { useT } from '@/lib/hooks/useT';
import { ApiError, postJson } from '@/lib/api-client';
import { formatPrice, PERIOD_MULTIPLIERS, resolveMembershipTierPrice } from '@/lib/pricing';
import { formatDate } from '@/lib/dates';
import { purchaseBlock } from '@mucho-loco/customer-core/membership-rules';

const PERIODS: PlanKey[] = ['visit', 'weekly', 'monthly', 'quarterly', 'annual'];

const LABEL_CLASS = 'block font-mono text-10 text-ml-cream-dim uppercase tracking-wide-xl mb-2';
const optionClass = (on: boolean) =>
  `p-4 text-left border cursor-pointer text-ml-cream ${on ? 'border-ml-red bg-ml-card' : 'border-ml-border bg-transparent'}`;

interface MembershipCheckoutClientProps {
  branches: Branch[];
  tiers: MembershipTier[];
  membership: MembershipInfo | null;
  initial: MembershipPlanChoice;
  /**
   * Hasta cuándo sigue pagado lo que ya tiene, si al renovar se respeta
   * (el primer cobro cae ese día). Lo calcula el servidor: depende de "ahora".
   */
  carryOverUntil: string | null;
  /** Volvió de Stripe con "cancelar". */
  cancelled: boolean;
}

/**
 * Elegir sucursal, alcance y duración, y mandar a pagar a Stripe. El precio
 * que se ve aquí es una vista previa: el que se cobra lo calcula el backend
 * con la misma tabla, y el browser nunca lo manda.
 */
export default function MembershipCheckoutClient({
  branches,
  tiers,
  membership,
  initial,
  carryOverUntil,
  cancelled,
}: MembershipCheckoutClientProps) {
  const t = useT();
  const lang = useLocale() as Lang;
  const copy = t.membershipCheckout;
  const [plan, setPlan] = useState<MembershipPlanChoice>(initial);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const branch = branches.find((b) => b.id === plan.branchId) ?? branches[0];
  const tier = tiers.find((x) => x.key === plan.tierKey);
  const price = resolveMembershipTierPrice(tier ?? { factor: 1 }, branch.price, PERIOD_MULTIPLIERS[plan.periodKey]);
  const recurring = plan.periodKey !== 'visit';

  // Las mismas reglas que aplica el backend, solo para no ofrecer un botón que
  // va a rebotar. Si esto se desviara, el backend igual responde 409.
  const block = purchaseBlock(membership, plan.periodKey);
  const blockedReason =
    block === 'ALREADY_SUBSCRIBED' ? copy.alreadySubscribed : block === 'MEMBERSHIP_STILL_ACTIVE' ? copy.stillActive : null;
  const carryOver = recurring && carryOverUntil !== null;

  function choose<K extends keyof MembershipPlanChoice>(key: K, value: MembershipPlanChoice[K]) {
    setPlan((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  async function pay() {
    setPaying(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const query = `plan=${plan.tierKey}&period=${plan.periodKey}&branch=${plan.branchId}`;
      const { url } = await postJson<{ url: string }>('/api/membership/checkout', {
        plan,
        lang,
        // Volver de Stripe NO activa nada: la membresía la activa el webhook.
        // El panel lo sabe por `membership=paid` y dice "confirmando".
        successUrl: `${origin}/${lang}/dashboard?membership=paid`,
        cancelUrl: `${origin}/${lang}/membership?cancelled=1&${query}`,
      });
      window.location.href = url;
    } catch (e) {
      if (e instanceof ApiError) {
        setError(
          e.code === 'ALREADY_SUBSCRIBED'
            ? copy.alreadySubscribed
            : e.code === 'MEMBERSHIP_STILL_ACTIVE'
              ? copy.stillActive
              : copy.error,
        );
      } else {
        setError(t.common.connectionError);
      }
      setPaying(false);
    }
  }

  const notice = blockedReason ?? error;

  return (
    <div className="pane active">
      <div className="max-w-[760px]">
        <div className={LABEL_CLASS}>{copy.eyebrow}</div>
        <h1 className="font-display text-[clamp(40px,5vw,64px)] leading-[0.95] mb-2">{copy.title}</h1>
        <p className="text-ml-cream-dim text-[15px] mb-7">{copy.sub}</p>

        {cancelled && (
          <p role="status" className="px-4 py-3 mb-6 text-sm border border-ml-border bg-ml-card">
            {copy.cancelled}
          </p>
        )}

        <label className={LABEL_CLASS} htmlFor="membership-branch">{copy.branchLabel}</label>
        <select
          id="membership-branch"
          value={plan.branchId}
          onChange={(e) => choose('branchId', Number(e.target.value))}
          className="w-full p-3.5 mb-2 bg-ml-card border border-ml-border text-ml-cream"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name} · {b.city}</option>
          ))}
        </select>
        <p className="text-xs text-ml-cream-dim mb-6">
          {plan.tierKey === 'single' ? copy.branchNoteSingle : copy.branchNoteAll}
        </p>

        <div className={LABEL_CLASS} id="membership-tier">{copy.tierLabel}</div>
        <div role="radiogroup" aria-labelledby="membership-tier" className="grid grid-cols-2 gap-3 mb-6">
          {tiers.map((x) => (
            <button
              key={x.key}
              type="button"
              role="radio"
              aria-checked={plan.tierKey === x.key}
              onClick={() => choose('tierKey', x.key)}
              className={optionClass(plan.tierKey === x.key)}
            >
              <b className="font-display text-lg block">{x.name[lang]}</b>
              <small className="text-xs text-ml-cream-dim">{x.badge[lang]}</small>
            </button>
          ))}
        </div>

        <div className={LABEL_CLASS} id="membership-period">{copy.periodLabel}</div>
        <div role="radiogroup" aria-labelledby="membership-period" className="flex flex-wrap gap-2 mb-6">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={plan.periodKey === p}
              onClick={() => choose('periodKey', p)}
              className={optionClass(plan.periodKey === p) + ' px-4 py-2.5 font-bebas tracking-wide'}
            >
              {t.memberships[p]}
            </button>
          ))}
        </div>

        <div className="bg-ml-card border border-ml-border p-6">
          <div className="flex items-baseline justify-between gap-4 mb-2">
            <span className={LABEL_CLASS}>{copy.totalLabel}</span>
            <span>
              <b className="font-display text-[40px] leading-none">{formatPrice(price)}</b>{' '}
              <span className="text-ml-cream-dim text-sm">MXN {copy.periodSuffix[plan.periodKey]}</span>
            </span>
          </div>
          <p className="text-sm text-ml-cream-dim">{recurring ? copy.recurringNote : copy.oneTimeNote}</p>
          {carryOver && carryOverUntil && (
            <p className="text-sm mt-2">
              {copy.carryOverPrefix} {formatDate(carryOverUntil, lang)} {copy.carryOverSuffix}
            </p>
          )}
          {notice && <p role="alert" className="text-sm text-ml-red-bright mt-3">{notice}</p>}
          <button
            type="button"
            onClick={pay}
            disabled={paying || blockedReason !== null}
            className="mt-4 w-full p-4 bg-ml-red text-ml-cream font-display text-22 tracking-[0.04em] border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {paying ? copy.paying : copy.pay}
          </button>
        </div>
      </div>
    </div>
  );
}
