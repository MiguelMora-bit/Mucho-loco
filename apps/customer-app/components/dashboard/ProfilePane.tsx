import { LuUser, LuMail, LuPhone, LuCake } from 'react-icons/lu';
import type { Lang, MembershipInfo, Translations, UserProfile } from '@mucho-loco/types';
import { Link } from '@/i18n/routing';
import { InfoList } from './InfoList';
import { formatDate } from '../../lib/dates';

interface ProfilePaneProps {
  t: Translations;
  lang: Lang;
  active: boolean;
  profile: UserProfile;
  /** null = todavía no contrata. */
  membership: MembershipInfo | null;
  planHref: string;
}

const PLAN_BUTTON_CLASS = 'block mt-2 w-full p-3.5 text-center bg-ml-red text-ml-cream font-display text-lg tracking-[0.04em]';

export function ProfilePane({ t, lang, active, profile, membership, planHref }: ProfilePaneProps) {
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
          {membership ? (
            <InfoList
              items={[
                [t.dashboard.profile.planLabel, membership.plan],
                [t.dashboard.profile.branchLabel, membership.branch],
                [t.dashboard.profile.expiresLabel, formatDate(membership.expiresAt, lang)],
                [t.dashboard.profile.statusLabel, t.dashboard.membershipStatus[membership.status]],
                [t.dashboard.profile.partnersLabel, t.dashboard.profile.notLinked],
              ]}
            />
          ) : (
            <InfoList items={[[t.dashboard.profile.planLabel, t.dashboard.profile.noMembership]]} />
          )}
          {/* Con suscripción viva no hay nada que renovar: Stripe cobra solo. */}
          {!membership && <Link href={planHref} className={PLAN_BUTTON_CLASS}>{t.dashboard.home.choosePlan}</Link>}
          {membership && !(membership.autoRenews && membership.status === 'active') && (
            <Link href={planHref} className={PLAN_BUTTON_CLASS}>{t.dashboard.profile.renewMembership}</Link>
          )}
        </div>
      </div>
    </div>
  );
}
