import { LuUser, LuMail, LuPhone, LuCake } from 'react-icons/lu';
import type { MembershipInfo, Translations, UserProfile } from '@mucho-loco/types';
import { InfoList } from './InfoList';

interface ProfilePaneProps {
  t: Translations;
  active: boolean;
  profile: UserProfile;
  membership: MembershipInfo;
  onRenew: () => void;
}

export function ProfilePane({ t, active, profile, membership, onRenew }: ProfilePaneProps) {
  return (
    <div className={'pane' + (active ? ' active' : '')}>
      <div className="grid grid-cols-2 gap-6 max-w-[900px]">
        <div className="bg-ml-card border border-ml-border p-6">
          <div className="font-display text-22 mb-4.5">{t.dashboard.profile.personalData}</div>
          <InfoList
            items={[
              [t.dashboard.profile.nameLabel, profile.name, <LuUser key="i" size={14} />, 'info-anim-breathe'],
              [t.dashboard.profile.emailLabel, profile.email, <LuMail key="i" size={14} />, 'info-anim-bounce'],
              [t.dashboard.profile.phoneLabel, profile.phone, <LuPhone key="i" size={14} />, 'info-anim-wobble'],
              [t.dashboard.profile.birthdateLabel, profile.birthdate, <LuCake key="i" size={14} />, 'info-anim-flicker'],
            ]}
          />
        </div>
        <div className="bg-ml-card border border-ml-border p-6">
          <div className="font-display text-22 mb-4.5">{t.dashboard.profile.myMembership}</div>
          <InfoList
            items={[
              [t.dashboard.profile.planLabel, membership.plan],
              [t.dashboard.profile.branchLabel, membership.branch],
              [t.dashboard.profile.expiresLabel, membership.expiresAt],
              [t.dashboard.profile.partnersLabel, t.dashboard.profile.notLinked],
            ]}
          />
          <button onClick={onRenew} className="mt-2 w-full p-3.5 bg-ml-red text-ml-cream font-display text-lg tracking-[0.04em] border-none cursor-pointer">
            {t.dashboard.profile.renewMembership}
          </button>
        </div>
      </div>
    </div>
  );
}
