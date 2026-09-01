'use client';

import { useState } from 'react';
import { Link } from '@/i18n/routing';
import { calculateMembershipPrice } from '../../lib/pricing';
import type { Branch, Lang, PlanKey, TierKey, Translations } from '@mucho-loco/types';

interface MembershipsProps {
  t: Translations;
  branches: Branch[];
  branch: Branch;
  setBranchId: (id: number) => void;
  mult: Record<PlanKey, number>;
  label: Record<PlanKey, string>;
  lang: Lang;
}

export function Memberships({ t, branches, branch, setBranchId, mult, label, lang }: MembershipsProps) {
  const [selPeriod, setSelPeriod] = useState<Record<TierKey, PlanKey>>({ single: 'monthly', all: 'monthly' });
  const tiers: Array<{ key: TierKey; name: string; factor: number; perks: string[]; badge: string; popular?: boolean }> = [
    {
      key: 'single',
      name: lang === 'es' ? 'UNA SUCURSAL' : 'ONE GYM',
      factor: 1.0,
      perks: lang === 'es'
        ? ['Acceso a ' + branch.name, 'Todas las clases de esa sucursal', 'Locker incluido', 'Horario completo 5:00 – 23:00', 'Acceso a la app con rutinas']
        : ['Access to ' + branch.name, 'All classes at that location', 'Locker included', 'Full schedule 5:00 – 11:00 PM', 'App with workouts'],
      badge: lang === 'es' ? '1 SUCURSAL' : '1 GYM',
    },
    {
      key: 'all',
      name: lang === 'es' ? 'TODAS LAS SUCURSALES' : 'ALL GYMS',
      factor: 1.5,
      popular: true,
      perks: lang === 'es'
        ? ['Acceso a las 15 sucursales', 'Todas las clases en cualquier sede', 'Locker incluido', 'Horario completo en todas', 'Invitado al mes', 'Asesoría nutricional', 'App con rutinas']
        : ['Access to all 15 gyms', 'All classes at any location', 'Locker included', 'Full schedule everywhere', 'One guest/month', 'Nutrition coaching', 'App with workouts'],
      badge: lang === 'es' ? '15 SUCURSALES' : '15 GYMS',
    },
  ];
  const periods: Array<{ key: PlanKey; name: string; suffix: string }> = [
    { key: 'visit',     name: t.memberships.visit,     suffix: label.visit },
    { key: 'weekly',    name: t.memberships.weekly,    suffix: label.weekly },
    { key: 'monthly',   name: t.memberships.monthly,   suffix: label.monthly },
    { key: 'quarterly', name: t.memberships.quarterly, suffix: label.quarterly },
    { key: 'annual',    name: t.memberships.annual,    suffix: label.annual },
  ];
  return (
    <section className="memberships" id="memberships">
      <div className="section-head">
        <div className="section-eyebrow">{t.memberships.eyebrow}</div>
        <h2 className="section-title"><span className="red">{t.memberships.titleA}</span><br />{t.memberships.titleB}</h2>
        <p className="section-sub">{t.memberships.sub}</p>
      </div>
      <div className="memb-branch-pick">
        <label>{t.memberships.choose}</label>
        <div className="memb-branch-select">
          <select value={branch.id} onChange={(e) => setBranchId(parseInt(e.target.value))}>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name} · {b.city}</option>)}
          </select>
          <span className="memb-branch-arrow">▾</span>
        </div>
        <span className="memb-branch-note">{lang === 'es' ? 'Los precios cambian según la sucursal' : 'Prices change by location'}</span>
      </div>
      <div className="memb-grid memb-grid-2">
        {tiers.map((tier) => {
          const cur = selPeriod[tier.key];
          const heroPrice = calculateMembershipPrice(branch.price, tier.factor, mult[cur]);
          const curName = periods.find((p) => p.key === cur)!.name;
          return (
            <div key={tier.key} className={'memb-card' + (tier.popular ? ' popular' : '')}>
              {tier.popular && <div className="pop-badge">{t.memberships.popular}</div>}
              <div className="tier-badge">{tier.badge}</div>
              <h3>{tier.name}</h3>
              <div className="price">
                <span className="currency">$</span>
                <span className="amount">{heroPrice.toLocaleString()}</span>
                <span className="per">{label[cur]}</span>
              </div>
              <div className="font-mono text-[11px] text-ml-cream-dim tracking-wide-xl">
                📍 {tier.key === 'single' ? branch.name + ' · ' + branch.city : (lang === 'es' ? '15 sucursales · CDMX & Edo. Méx.' : '15 gyms · Mexico City area')}
              </div>
              <div className="memb-plans">
                <div className="memb-plans-head">{lang === 'es' ? 'Elige tu periodo' : 'Choose your period'}</div>
                {periods.map((pr) => {
                  const p = calculateMembershipPrice(branch.price, tier.factor, mult[pr.key]);
                  const on = pr.key === cur;
                  return (
                    <button type="button" key={pr.key}
                      className={'memb-plan-row' + (on ? ' selected' : '')}
                      onClick={() => setSelPeriod((s) => ({ ...s, [tier.key]: pr.key }))}>
                      <span className="mp-radio" aria-hidden="true"></span>
                      <span className="mp-name">{pr.name}</span>
                      <span className="mp-price">${p.toLocaleString()}<em>{pr.suffix}</em></span>
                    </button>
                  );
                })}
              </div>
              <div className="memb-hours">
                <span className="mh-ico">🕐</span>
                <div>
                  <div className="mh-label">{lang === 'es' ? 'Horario del gym' : 'Gym hours'}</div>
                  <div className="mh-value">{tier.key === 'single' ? branch.hours : '5:00 — 23:00'} · {lang === 'es' ? 'Lun a Dom' : 'Mon to Sun'}</div>
                </div>
              </div>
              <Link href={`/account?plan=${tier.key}&period=${cur}`} className="select-btn block text-center">
                {t.memberships.select} · {curName} →
              </Link>
            </div>
          );
        })}
      </div>
      <div className="partners">
        <div className="partners-head">
          <span className="partners-eyebrow">{lang === 'es' ? 'Apps del bienestar' : 'Wellness apps'}</span>
          <h4>{t.memberships.partners}</h4>
          <p>{t.memberships.partnersSub}</p>
          <span className="partners-note">{lang === 'es' ? 'Vincula tu plan corporativo y entra sin pagar de más' : 'Link your corporate plan and walk right in'}</span>
        </div>
        <div className="partners-logos">
          <a href="#" className="partner-card tp">
            <span className="ico">T</span>
            <span className="pc-body">
              <b>TotalPass</b>
              <small>{lang === 'es' ? 'Entra con tus créditos' : 'Use your credits'}</small>
            </span>
            <span className="pc-go">{lang === 'es' ? 'Aceptado' : 'Accepted'} ✓</span>
          </a>
          <a href="#" className="partner-card wh">
            <span className="ico">W</span>
            <span className="pc-body">
              <b>Wellhub</b>
              <small>{lang === 'es' ? 'Antes Gympass' : 'Formerly Gympass'}</small>
            </span>
            <span className="pc-go">{lang === 'es' ? 'Aceptado' : 'Accepted'} ✓</span>
          </a>
        </div>
      </div>
    </section>
  );
}
