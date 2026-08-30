'use client';

import { useState } from 'react';
import { Link, useRouter } from '@/i18n/routing';
import { useAuthStore } from '@/lib/stores/auth.store';
import type { UserProfile, MembershipInfo, Visit, Order } from '@mucho-loco/types';

type PaneKey = 'home' | 'access' | 'orders' | 'profile';

const NAV_ITEMS: Array<{ key: PaneKey; label: string; icon: string }> = [
  { key: 'home',    label: 'INICIO',      icon: '🏠' },
  { key: 'access',  label: 'MI ACCESO',   icon: '🎫' },
  { key: 'orders',  label: 'MIS PEDIDOS', icon: '📦' },
  { key: 'profile', label: 'MI PERFIL',   icon: '⚙️' },
];
const DAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

interface PanelClientProps {
  profile: UserProfile;
  membership: MembershipInfo;
  history: Visit[];
  orders: Order[];
}

export default function PanelClient({ profile, membership, history, orders }: PanelClientProps) {
  const router = useRouter();
  const { clear } = useAuthStore();
  const [pane, setPane] = useState<PaneKey>('home');
  const [qrOpen, setQrOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    clear();
    router.push('/');
  }

  return (
    <div className="panel-layout grid grid-cols-[260px_1fr] min-h-screen">
      {qrOpen && (
        <div className="qr-full" onClick={() => setQrOpen(false)}>
          <div className="w-[380px] max-w-[80vw] aspect-square bg-white p-6 shadow-orange grid place-items-center">
            <div className="font-mono text-[11px] text-[#333] text-center">
              <div className="text-[60px] mb-4">▓▓▓▓▓▓</div>
              <div>▓ · · · ▓</div>
              <div>▓ ▓▓▓ · ▓</div>
              <div>▓ · · · ▓</div>
              <div>▓▓▓▓▓▓▓▓</div>
              <div className="mt-3 text-[9px] tracking-wide-2xl">ML-DIEGO-2026-ALLGYMS</div>
            </div>
          </div>
          <h2 className="font-display text-5xl mt-7">MUESTRA ESTE QR</h2>
          <p className="text-ml-cream-dim mt-2 text-sm">En recepción de cualquier sucursal · Válido hoy</p>
          <button onClick={() => setQrOpen(false)} className="mt-6 px-7 py-3 border border-ml-border text-ml-cream font-bebas text-lg bg-transparent cursor-pointer">CERRAR</button>
        </div>
      )}

      <aside className="[background:linear-gradient(180deg,#100606,#050202)] border-r border-ml-border flex flex-col py-6 sticky top-0 h-screen">
        <div className="side-brand flex items-center gap-3 px-[22px] pb-6 border-b border-ml-border">
          <img src="/assets/bull-head.png" className="w-11 h-11 object-contain drop-shadow-[0_0_8px_rgba(225,20,28,0.7)]" alt="" />
          <div className="side-brand-name font-display text-xl leading-none">MUCHO<br /><span className="text-ml-red">LOCO</span></div>
        </div>
        <nav className="px-[14px] py-[18px] flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <button key={item.key} className={'nav-item' + (pane === item.key ? ' active' : '')} onClick={() => setPane(item.key)}>
              <span className="text-xl">{item.icon}</span>
              <span className="side-label">{item.label}</span>
            </button>
          ))}
          <Link href="/rendimiento" className="nav-item no-underline">
            <span className="text-xl">📈</span>
            <span className="side-label">RENDIMIENTO</span>
          </Link>
        </nav>
        <div className="side-foot px-[22px] py-[14px] border-t border-ml-border text-[11px] text-ml-muted font-mono tracking-wide uppercase">
          <Link href="/" className="text-ml-cream-dim no-underline block mb-2">← VOLVER AL SITIO</Link>
          <button onClick={handleLogout} className="bg-transparent border-none text-ml-cream-dim cursor-pointer font-mono text-[11px] tracking-wide uppercase p-0">CERRAR SESIÓN</button>
        </div>
      </aside>

      <main className="bg-ml-black">
        <div className="sticky top-0 z-50 flex items-center gap-[18px] px-8 py-[18px] bg-[rgba(10,6,6,0.85)] backdrop-blur-[10px] border-b border-ml-border">
          <div>
            <div className="font-mono text-[11px] text-ml-muted uppercase tracking-wide-xl">MUCHO LOCO · MI CUENTA</div>
            <h1 className="font-display text-[32px] leading-none">{NAV_ITEMS.find((n) => n.key === pane)?.label || 'MI CUENTA'}</h1>
          </div>
          <span className="flex-1" />
          <div className="w-[42px] h-[42px] rounded-full bg-ml-red grid place-items-center font-display text-xl text-white">
            {profile.name[0]}
          </div>
        </div>

        {/* HOME */}
        <div className={'pane' + (pane === 'home' ? ' active' : '')}>
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
            <button onClick={() => setPane('access')} className="px-5 py-2.5 bg-ml-red text-white font-bebas tracking-wide text-sm border-none cursor-pointer">RENOVAR</button>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-7">
            {[
              { lbl: 'VISITAS ESTE MES',       num: membership.visits,   delta: '+3 vs mes anterior',   up: true },
              { lbl: 'DÍAS DE STREAK',          num: membership.streak,   delta: 'Mejor racha: 14 días' },
              { lbl: 'DÍAS RESTANTES',          num: membership.daysLeft, delta: 'Plan All Gyms · Mensual' },
              { lbl: 'SUCURSALES VISITADAS',    num: 3,                   delta: 'Este mes' },
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

        {/* ACCESS / QR */}
        <div className={'pane' + (pane === 'access' ? ' active' : '')}>
          <div className="grid grid-cols-[460px_1fr] gap-6 items-start">
            <div>
              <div className="card-pass">
                <div className="absolute left-0 right-0 h-px border-t-2 border-dashed border-[rgba(255,255,255,0.18)]" style={{ top: '70%' }} />
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="font-display text-[32px] leading-none">{profile.name}</div>
                    <div className="font-mono text-[11px] text-ml-cream-dim uppercase tracking-wide-xl mt-1">{membership.plan}</div>
                  </div>
                  <div className="w-[70px] h-[70px] rounded-full border-2 border-ml-red bg-ml-card grid place-items-center font-display text-[30px]">{profile.name[0]}</div>
                </div>
                <div className="grid grid-cols-2 gap-4 py-5 border-t border-[rgba(255,255,255,0.08)]">
                  <div><div className="font-mono text-[10px] text-ml-cream-dim uppercase tracking-wide-xl mb-1">VENCE</div><b className="font-display text-lg">{membership.expiresAt}</b></div>
                  <div><div className="font-mono text-[10px] text-ml-cream-dim uppercase tracking-wide-xl mb-1">SUCURSAL</div><b className="font-display text-lg">15 GYMS</b></div>
                </div>
                <button onClick={() => setQrOpen(true)} className="w-full mt-[18px] p-4 bg-ml-red text-white font-display text-[22px] tracking-[0.04em] border-none cursor-pointer">
                  📲 MOSTRAR QR DE ACCESO
                </button>
              </div>
            </div>
            <div>
              <div className="font-display text-[22px] mb-[14px]">HISTORIAL DE ACCESOS</div>
              {history.map((h, i) => (
                <div key={i} className="acc-row">
                  <div className="w-[50px] text-center flex-[0_0_50px]">
                    <b className="font-display text-[22px] leading-none text-ml-red block">{h.day}</b>
                    <small className="text-[10px] text-ml-cream-dim font-mono">{h.month}</small>
                  </div>
                  <div className="flex-1 text-sm">
                    <b>{h.branch}</b>
                    <small className="text-ml-cream-dim text-[11px] block">Entrada registrada · QR válido</small>
                  </div>
                  <span className="font-mono text-ml-orange text-xs tracking-[0.05em]">{h.duration}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ORDERS */}
        <div className={'pane' + (pane === 'orders' ? ' active' : '')}>
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="flex items-center justify-between mb-[14px]">
                <span className="font-mono text-xs text-ml-cream-dim uppercase tracking-[0.12em]">{order.id} · {order.date}</span>
                <span className={'status ' + order.status}>{order.status === 'ready' ? 'LISTO PARA RETIRO' : 'ENTREGADO'}</span>
              </div>
              <div className="flex gap-2.5 flex-wrap">
                {order.items.map((item, i) => (
                  <div key={i} className="flex gap-2.5 items-center px-3 py-2 bg-ml-card-2">
                    <img src={item.img} className="w-[42px] h-[42px] object-cover" alt="" />
                    <div><b className="text-[13px]">{item.name}</b><small className="text-[11px] text-ml-cream-dim block">{item.flav}</small></div>
                  </div>
                ))}
              </div>
              <div className="font-display text-[28px] text-ml-red mt-2.5">${order.total.toLocaleString()} MXN</div>
            </div>
          ))}
        </div>

        {/* PROFILE */}
        <div className={'pane' + (pane === 'profile' ? ' active' : '')}>
          <div className="grid grid-cols-2 gap-6 max-w-[900px]">
            <div className="bg-ml-card border border-ml-border p-6">
              <div className="font-display text-[22px] mb-[18px]">DATOS PERSONALES</div>
              {([
                ['Nombre', profile.name],
                ['Email', profile.email],
                ['Teléfono', profile.phone],
                ['Fecha de nacimiento', profile.birthdate],
              ] as [string, string][]).map(([label, val]) => (
                <div key={label} className="mb-[14px]">
                  <div className="font-mono text-[11px] text-ml-cream-dim uppercase tracking-wide mb-1">{label}</div>
                  <div className="text-[15px]">{val}</div>
                </div>
              ))}
            </div>
            <div className="bg-ml-card border border-ml-border p-6">
              <div className="font-display text-[22px] mb-[18px]">MI MEMBRESÍA</div>
              {([
                ['Plan',              membership.plan],
                ['Sucursal principal', membership.branch],
                ['Vencimiento',       membership.expiresAt],
                ['TotalPass / Wellhub', 'NO VINCULADO'],
              ] as [string, string][]).map(([label, val]) => (
                <div key={label} className="mb-[14px]">
                  <div className="font-mono text-[11px] text-ml-cream-dim uppercase tracking-wide mb-1">{label}</div>
                  <div className="text-[15px]">{val}</div>
                </div>
              ))}
              <button onClick={() => {}} className="mt-2 w-full p-[14px] bg-ml-red text-white font-display text-lg tracking-[0.04em] border-none cursor-pointer">
                RENOVAR MEMBRESÍA
              </button>
            </div>
          </div>
          <div className="mt-6">
            <button onClick={handleLogout} className="px-7 py-[14px] border border-ml-border text-ml-cream-dim font-display text-base tracking-[0.04em] bg-transparent cursor-pointer">
              CERRAR SESIÓN
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
