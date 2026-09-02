import type { MembershipInfo, UserProfile, Visit } from '@mucho-loco/types';

interface AccessPaneProps {
  active: boolean;
  profile: UserProfile;
  membership: MembershipInfo;
  history: Visit[];
  onShowQr: () => void;
}

export function AccessPane({ active, profile, membership, history, onShowQr }: AccessPaneProps) {
  return (
    <div className={'pane' + (active ? ' active' : '')}>
      <div className="grid grid-cols-[460px_1fr] gap-6 items-start">
        <div>
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
              <div><div className="font-mono text-10 text-ml-cream-dim uppercase tracking-wide-xl mb-1">VENCE</div><b className="font-display text-lg">{membership.expiresAt}</b></div>
              <div><div className="font-mono text-10 text-ml-cream-dim uppercase tracking-wide-xl mb-1">SUCURSAL</div><b className="font-display text-lg">15 GYMS</b></div>
            </div>
            <button onClick={onShowQr} className="w-full mt-4.5 p-4 bg-ml-red text-white font-display text-22 tracking-[0.04em] border-none cursor-pointer">
              📲 MOSTRAR QR DE ACCESO
            </button>
          </div>
        </div>
        <div>
          <div className="font-display text-22 mb-3.5">HISTORIAL DE ACCESOS</div>
          {history.map((h, i) => (
            <div key={i} className="acc-row">
              <div className="w-[50px] text-center flex-[0_0_50px]">
                <b className="font-display text-22 leading-none text-ml-red block">{h.day}</b>
                <small className="text-10 text-ml-cream-dim font-mono">{h.month}</small>
              </div>
              <div className="flex-1 text-sm">
                <b>{h.branch}</b>
                <small className="text-ml-cream-dim text-11 block">Entrada registrada · QR válido</small>
              </div>
              <span className="font-mono text-ml-orange text-xs tracking-[0.05em]">{h.duration}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
