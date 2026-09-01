import type { MembershipInfo, UserProfile } from '@mucho-loco/types';

const DAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

interface HomePaneProps {
  active: boolean;
  profile: UserProfile;
  membership: MembershipInfo;
  onRenew: () => void;
}

export function HomePane({ active, profile, membership, onRenew }: HomePaneProps) {
  return (
    <div className={'pane' + (active ? ' active' : '')}>
      <div className="font-display text-[clamp(40px,5vw,64px)] leading-[0.95] mb-2">
        BIENVENIDO,<br /><span style={{ background: 'linear-gradient(180deg, #ffe066, #ff8c1a 40%, #e1141c 75%, #8b0a10)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{profile.name.split(' ')[0]}</span>
      </div>
      <p className="text-ml-cream-dim text-[15px] mb-7">Sucursal principal: {membership.branch} · Plan: {membership.plan}</p>

      <div className="flex items-center gap-4 px-[22px] py-4 mb-7 [background:linear-gradient(90deg,rgba(225,20,28,0.18),rgba(225,20,28,0.04))] border border-ml-red border-l-[4px] border-l-ml-red-bright">
        <span className="text-[26px]">⚠️</span>
        <div className="flex-1">
          <b className="font-display text-lg tracking-[0.04em]">MEMBRESÍA VENCE EN {membership.daysLeft} DÍAS</b>
          <p className="text-sm text-ml-cream-dim mt-0.5">Renueva ahora para no perder tu streak de {membership.streak} días y tu acceso continuo.</p>
        </div>
        <button onClick={onRenew} className="px-5 py-2.5 bg-ml-red text-white font-bebas tracking-wide text-sm border-none cursor-pointer">RENOVAR</button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-7">
        {[
          { lbl: 'VISITAS ESTE MES', num: membership.visits, delta: '+3 vs mes anterior', up: true },
          { lbl: 'DÍAS DE STREAK', num: membership.streak, delta: 'Mejor racha: 14 días' },
          { lbl: 'DÍAS RESTANTES', num: membership.daysLeft, delta: 'Plan All Gyms · Mensual' },
          { lbl: 'SUCURSALES VISITADAS', num: 3, delta: 'Este mes' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="font-mono text-[10px] text-ml-cream-dim uppercase tracking-wide-xl mb-1.5">{s.lbl}</div>
            <div className="font-display text-[56px] leading-none">{s.num}</div>
            <div className={`text-xs mt-2 ${s.up ? 'text-[#6dd56d]' : 'text-ml-cream-dim'}`}>{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="font-display text-[22px] mb-4">ESTA SEMANA</div>
      <div className="week-grid">
        {DAYS.map((d, i) => (
          <div key={d} className={'week-day' + (i === TODAY_IDX ? ' today' : '') + (i < TODAY_IDX ? ' done' : '')}>
            <div className="font-mono text-[10px] text-ml-cream-dim tracking-wide mb-2">{d}</div>
            <div className="text-[22px]">{i < TODAY_IDX ? '✓' : i === TODAY_IDX ? '🔥' : '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
