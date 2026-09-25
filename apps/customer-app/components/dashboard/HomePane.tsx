import type { Lang, MembershipInfo, Translations, UserProfile } from '@mucho-loco/types';
import { membershipPlanLabel } from '@mucho-loco/customer-core/membership-rules';
import { Link } from '@/i18n/routing';
import { formatDate } from '../../lib/dates';

const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

interface HomePaneProps {
  t: Translations;
  lang: Lang;
  active: boolean;
  profile: UserProfile;
  /** null = todavía no contrata. */
  membership: MembershipInfo | null;
  /** Acaba de volver de pagar en Stripe (`?membership=paid`). */
  justPaid: boolean;
  /** A dónde lleva "elegir plan" / "renovar" / "reactivar". */
  planHref: string;
  onRetryPayment: () => void;
  retryingPayment: boolean;
  retryError: string | null;
  /** Abre el portal de Stripe (spec 005). */
  onManageSubscription: () => void;
  managingSubscription: boolean;
  manageError: string | null;
}

const BANNER_CLASS = 'flex items-center gap-4 px-5.5 py-4 mb-7 [background:linear-gradient(90deg,rgba(225,20,28,0.18),rgba(225,20,28,0.04))] border border-ml-red border-l-[4px] border-l-ml-red-bright';
const BANNER_BUTTON_CLASS = 'px-5 py-2.5 bg-ml-red text-ml-cream font-bebas tracking-wide text-sm border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export function HomePane({ t, lang, active, profile, membership, justPaid, planHref, onRetryPayment, retryingPayment, retryError, onManageSubscription, managingSubscription, manageError }: HomePaneProps) {
  const stats = [
    { lbl: t.dashboard.home.statVisits, num: membership?.visits ?? 0, delta: t.dashboard.home.statVisitsDelta, up: true },
    { lbl: t.dashboard.home.statStreak, num: membership?.streak ?? 0, delta: t.dashboard.home.statStreakDelta },
    { lbl: t.dashboard.home.statDaysLeft, num: membership?.daysLeft ?? 0, delta: membership ? membershipPlanLabel(t, membership) : '' },
    { lbl: t.dashboard.home.statBranches, num: 3, delta: t.dashboard.home.statBranchesDelta },
  ];
  // Volvió de Stripe pero el webhook todavía no llega (o el banco no ha
  // confirmado): no es un error, son segundos. Volver de pagar NO activa nada.
  const processing = justPaid && membership?.status !== 'active';

  return (
    <div className={'pane' + (active ? ' active' : '')}>
      <div className="font-display text-[clamp(40px,5vw,64px)] leading-[0.95] mb-2">
        {t.dashboard.home.welcomePrefix}<br /><span style={{ background: 'linear-gradient(180deg, #ffe066, #ff8c1a 40%, #e1141c 75%, #8b0a10)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{profile.name.split(' ')[0]}</span>
      </div>
      {membership && (
        <p className="text-ml-cream-dim text-[15px] mb-7">{t.dashboard.home.branchLabel} {membership.branch} · {t.dashboard.home.planLabel} {membershipPlanLabel(t, membership)}</p>
      )}
      {!membership && <div className="mb-7" />}

      {processing && (
        <div className={BANNER_CLASS} role="status">
          <span className="text-[26px]">⏳</span>
          <div className="flex-1">
            <b className="font-display text-lg tracking-[0.04em]">{t.dashboard.home.paymentProcessingTitle}</b>
            <p className="text-sm text-ml-cream-dim mt-0.5">{t.dashboard.home.paymentProcessingBody}</p>
          </div>
        </div>
      )}

      {!membership && !processing && (
        <div className={BANNER_CLASS}>
          <span className="text-[26px]">🏋️</span>
          <div className="flex-1">
            <b className="font-display text-lg tracking-[0.04em]">{t.dashboard.home.noMembershipTitle}</b>
            <p className="text-sm text-ml-cream-dim mt-0.5">{t.dashboard.home.noMembershipBody}</p>
          </div>
          <Link href={planHref} className={BANNER_BUTTON_CLASS}>{t.dashboard.home.choosePlan}</Link>
        </div>
      )}

      {membership?.status === 'expired' && !processing && (
        <div className={BANNER_CLASS}>
          <span className="text-[26px]">🚫</span>
          <div className="flex-1">
            <b className="font-display text-lg tracking-[0.04em]">{t.dashboard.home.suspendedTitle}</b>
            <p className="text-sm text-ml-cream-dim mt-0.5">{t.dashboard.home.suspendedBody}</p>
          </div>
          <Link href={planHref} className={BANNER_BUTTON_CLASS}>{t.dashboard.home.reactivate}</Link>
        </div>
      )}

      {membership?.status === 'grace' && (
        <div className={BANNER_CLASS}>
          <span className="text-[26px]">💳</span>
          <div className="flex-1">
            <b className="font-display text-lg tracking-[0.04em]">{t.dashboard.home.paymentFailedTitle}</b>
            <p className="text-sm text-ml-cream-dim mt-0.5">{t.dashboard.home.paymentFailedBody} {t.dashboard.home.graceUntilPrefix} {membership.graceEndsAt ? formatDate(membership.graceEndsAt, lang) : ''}.</p>
            {retryError && <p className="text-xs text-ml-red-bright mt-1">{retryError}</p>}
          </div>
          <button onClick={onRetryPayment} disabled={retryingPayment} className={BANNER_BUTTON_CLASS}>
            {retryingPayment ? t.common.updating : t.dashboard.home.retryPayment}
          </button>
        </div>
      )}

      {/* Con suscripción no hay nada que renovar: Stripe cobra solo. Con la
          renovación cancelada la suscripción sigue viva: se reactiva en el
          portal, no contratando otra (el backend respondería ALREADY_SUBSCRIBED). */}
      {membership?.status === 'active' && !membership.hasSubscription && membership.daysLeft <= 15 && (
        <div className={BANNER_CLASS}>
          <span className="text-[26px]">⚠️</span>
          <div className="flex-1">
            <b className="font-display text-lg tracking-[0.04em]">{t.dashboard.home.membershipExpiringPrefix} {membership.daysLeft} {t.dashboard.home.membershipExpiringSuffix}</b>
            <p className="text-sm text-ml-cream-dim mt-0.5">{t.dashboard.home.renewNotePrefix} {membership.streak} {t.dashboard.home.renewNoteSuffix}</p>
          </div>
          <Link href={planHref} className={BANNER_BUTTON_CLASS}>{t.dashboard.home.renew}</Link>
        </div>
      )}

      {membership?.status === 'active' && membership.hasSubscription && !membership.autoRenews && (
        <div className={BANNER_CLASS}>
          <span className="text-[26px]">⏸️</span>
          <div className="flex-1">
            <b className="font-display text-lg tracking-[0.04em]">{t.dashboard.home.renewalCanceledPrefix} {formatDate(membership.expiresAt, lang)}.</b>
            {manageError && <p className="text-xs text-ml-red-bright mt-1">{manageError}</p>}
          </div>
          <button onClick={onManageSubscription} disabled={managingSubscription} className={BANNER_BUTTON_CLASS}>
            {managingSubscription ? t.common.updating : t.dashboard.home.reactivateRenewal}
          </button>
        </div>
      )}

      {membership?.status === 'active' && membership.autoRenews && (
        <div className="flex items-center gap-4 -mt-4 mb-7">
          <p className="text-sm text-ml-cream-dim">{t.dashboard.home.autoRenewsPrefix} {formatDate(membership.expiresAt, lang)}.</p>
          <button onClick={onManageSubscription} disabled={managingSubscription} className="text-xs underline text-ml-cream-dim bg-transparent border-none cursor-pointer disabled:opacity-50">
            {managingSubscription ? t.common.updating : t.dashboard.home.manageSubscription}
          </button>
          {manageError && <p className="text-xs text-ml-red-bright">{manageError}</p>}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-7">
        {stats.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="font-mono text-10 text-ml-cream-dim uppercase tracking-wide-xl mb-1.5">{s.lbl}</div>
            <div className="font-display text-[56px] leading-none">{s.num}</div>
            <div className={`text-xs mt-2 ${s.up ? 'text-ml-green' : 'text-ml-cream-dim'}`}>{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="font-display text-22 mb-4">{t.dashboard.home.thisWeek}</div>
      <div className="week-grid">
        {t.dashboard.home.weekdays.map((d, i) => (
          <div key={d} className={'week-day' + (i === TODAY_IDX ? ' today' : '') + (i < TODAY_IDX ? ' done' : '')}>
            <div className="font-mono text-10 text-ml-cream-dim tracking-wide mb-2">{d}</div>
            <div className="text-22">{i < TODAY_IDX ? '✓' : i === TODAY_IDX ? '🔥' : '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
