import type { MembershipInfo, UserProfile } from '@mucho-loco/types';
import { InfoList } from './InfoList';

interface ProfilePaneProps {
  active: boolean;
  profile: UserProfile;
  membership: MembershipInfo;
  onRenew: () => void;
  onLogout: () => void;
}

export function ProfilePane({ active, profile, membership, onRenew, onLogout }: ProfilePaneProps) {
  return (
    <div className={'pane' + (active ? ' active' : '')}>
      <div className="grid grid-cols-2 gap-6 max-w-[900px]">
        <div className="bg-ml-card border border-ml-border p-6">
          <div className="font-display text-[22px] mb-[18px]">DATOS PERSONALES</div>
          <InfoList
            items={[
              ['Nombre', profile.name],
              ['Email', profile.email],
              ['Teléfono', profile.phone],
              ['Fecha de nacimiento', profile.birthdate],
            ]}
          />
        </div>
        <div className="bg-ml-card border border-ml-border p-6">
          <div className="font-display text-[22px] mb-[18px]">MI MEMBRESÍA</div>
          <InfoList
            items={[
              ['Plan', membership.plan],
              ['Sucursal principal', membership.branch],
              ['Vencimiento', membership.expiresAt],
              ['TotalPass / Wellhub', 'NO VINCULADO'],
            ]}
          />
          <button onClick={onRenew} className="mt-2 w-full p-[14px] bg-ml-red text-white font-display text-lg tracking-[0.04em] border-none cursor-pointer">
            RENOVAR MEMBRESÍA
          </button>
        </div>
      </div>
      <div className="mt-6">
        <button onClick={onLogout} className="px-7 py-[14px] border border-ml-border text-ml-cream-dim font-display text-base tracking-[0.04em] bg-transparent cursor-pointer">
          CERRAR SESIÓN
        </button>
      </div>
    </div>
  );
}
