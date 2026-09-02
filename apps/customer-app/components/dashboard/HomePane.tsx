import type { MembershipInfo, Translations, UserProfile } from '@mucho-loco/types';

const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

interface HomePaneProps {
  t: Translations;
  active: boolean;
  profile: UserProfile;
  membership: MembershipInfo;
  onRenew: () => void;
}

export function HomePane({ t, active, profile, membership, onRenew }: HomePaneProps) {
  const stats = [
    { lbl: t.dashboard.home.statVisits, num: membership.visits, delta: t.dashboard.home.statVisitsDelta, up: true },
    { lbl: t.dashboard.home.statStreak, num: membership.streak, delta: t.dashboard.home.statStreakDelta },
    { lbl: t.dashboard.home.statDaysLeft, num: membership.daysLeft, delta: t.dashboard.home.statDaysLeftDelta },
    { lbl: t.dashboard.home.statBranches, num: 3, delta: t.dashboard.home.statBranchesDelta },
  ];

  return (
    <div className={'pane' + (active ? ' active' : '')}>
      <div className="font-display text-[clamp(40px,5vw,64px)] leading-[0.95] mb-2">
        {t.dashboard.home.welcomePrefix}<br /><span style={{ background: 'linear-gradient(180deg, #ffe066, #ff8c1a 40%, #e1141c 75%, #8b0a10)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{profile.name.split(' ')[0]}</span>
      </div>
      <p className="text-ml-cream-dim text-[15px] mb-7">{t.dashboard.home.branchLabel} {membership.branch} · {t.dashboard.home.planLabel} {membership.plan}</p>

      <div className="flex items-center gap-4 px-5.5 py-4 mb-7 [background:linear-gradient(90deg,rgba(225,20,28,0.18),rgba(225,20,28,0.04))] border border-ml-red border-l-[4px] border-l-ml-red-bright">
        <span className="text-[26px]">⚠️</span>
        <div className="flex-1">
          <b className="font-display text-lg tracking-[0.04em]">{t.dashboard.home.membershipExpiringPrefix} {membership.daysLeft} {t.dashboard.home.membershipExpiringSuffix}</b>
          <p className="text-sm text-ml-cream-dim mt-0.5">{t.dashboard.home.renewNotePrefix} {membership.streak} {t.dashboard.home.renewNoteSuffix}</p>
        </div>
        <button onClick={onRenew} className="px-5 py-2.5 bg-ml-red text-white font-bebas tracking-wide text-sm border-none cursor-pointer">{t.dashboard.home.renew}</button>
      </div>

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
