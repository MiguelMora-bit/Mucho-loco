import type { Lang, MembershipInfo, Translations, UserProfile, Visit } from '@mucho-loco/types';
import { Link } from '@/i18n/routing';
import { formatDate, formatDayOfMonth, formatDuration, formatMonthShort } from '../../lib/dates';

interface AccessPaneProps {
  t: Translations;
  lang: Lang;
  active: boolean;
  profile: UserProfile;
  /** null = todavía no contrata: no hay QR que mostrar. */
  membership: MembershipInfo | null;
  planHref: string;
  history: Visit[];
  onShowQr: () => void;
}

export function AccessPane({ t, lang, active, profile, membership, planHref, history, onShowQr }: AccessPaneProps) {
  return (
    <div className={'pane' + (active ? ' active' : '')}>
      <div className="grid grid-cols-[460px_1fr] gap-6 items-start">
        <div>
          {!membership && (
            <div className="card-pass">
              <div className="font-display text-[32px] leading-none mb-4">{profile.name}</div>
              <div className="px-3 py-2 mb-3 text-center text-xs font-mono uppercase tracking-wide-xl text-ml-cream-dim border border-ml-border">
                {t.dashboard.access.noMembershipNote}
              </div>
              <Link
                href={planHref}
                className="block w-full mt-4.5 p-4 text-center bg-ml-red text-ml-cream font-display text-22 tracking-[0.04em]"
              >
                {t.dashboard.home.choosePlan}
              </Link>
            </div>
          )}
          {membership && (
          <div className="card-pass">
            <div className="absolute left-0 right-0 h-px border-t-2 border-dashed border-[rgba(255,255,255,0.18)]" style={{ top: '70%' }} />
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="font-display text-[32px] leading-none">{profile.name}</div>
                <div className="font-mono text-11 text-ml-cream-dim uppercase tracking-wide-xl mt-1">{membership.plan}</div>
              </div>
              <div className="w-[70px] h-[70px] rounded-full border-2 border-ml-red bg-ml-card grid place-items-center font-display text-[30px]">{profile.name[0]}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 py-5 border-t border-[rgba(255,255,255,0.08)]">
              <div><div className="font-mono text-10 text-ml-cream-dim uppercase tracking-wide-xl mb-1">{t.dashboard.access.expiresLabel}</div><b className="font-display text-lg">{formatDate(membership.expiresAt, lang)}</b></div>
              <div><div className="font-mono text-10 text-ml-cream-dim uppercase tracking-wide-xl mb-1">{t.dashboard.access.branchLabel}</div><b className="font-display text-lg">{membership.tierKey === 'all' ? t.dashboard.access.allGyms : membership.branch}</b></div>
            </div>
            {membership.status !== 'active' && (
              <div className="px-3 py-2 mb-3 text-center text-xs font-mono uppercase tracking-wide-xl text-ml-red-bright border border-ml-red/40">
                {membership.status === 'grace' ? t.dashboard.membershipStatus.grace : t.dashboard.membershipStatus.expired}
              </div>
            )}
            <button
              onClick={onShowQr}
              disabled={membership.status === 'expired'}
              className="w-full mt-4.5 p-4 bg-ml-red text-ml-cream font-display text-22 tracking-[0.04em] border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {membership.status === 'expired' ? t.dashboard.access.suspendedNote : t.dashboard.access.showQr}
            </button>
          </div>
          )}
        </div>
        <div>
          <div className="font-display text-22 mb-3.5">{t.dashboard.access.accessHistory}</div>
          {history.map((h) => (
            <div key={h.visitedAt} className="acc-row">
              <div className="w-[50px] text-center flex-[0_0_50px]">
                <b className="font-display text-22 leading-none text-ml-red block">
                  {formatDayOfMonth(h.visitedAt, lang)}
                </b>
                <small className="text-10 text-ml-cream-dim font-mono">
                  {formatMonthShort(h.visitedAt, lang)}
                </small>
              </div>
              <div className="flex-1 text-sm">
                <b>{h.branch}</b>
                <small className="text-ml-cream-dim text-11 block">{t.dashboard.access.entryNote}</small>
              </div>
              <span className="font-mono text-ml-orange text-xs tracking-[0.05em]">
                {formatDuration(h.durationMinutes, lang)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
