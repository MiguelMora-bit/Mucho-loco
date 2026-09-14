'use client';

import { useState } from 'react';
import { Link } from '@/i18n/routing';
import { calculateMembershipPrice } from '../../lib/pricing';
import { useMembershipTiersStore } from '../../lib/stores/membershipTiers.store';
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
  const [pulse, setPulse] = useState<Record<TierKey, boolean>>({ single: false, all: false });

  function pickPeriod(tierKey: TierKey, periodKey: PlanKey) {
    setSelPeriod((s) => ({ ...s, [tierKey]: periodKey }));
    setPulse((s) => ({ ...s, [tierKey]: true }));
    setTimeout(() => setPulse((s) => ({ ...s, [tierKey]: false })), 420);
  }

  const rawTiers = useMembershipTiersStore((s) => s.data) ?? [];
  const tiers: Array<{ key: TierKey; name: string; factor: number; perks: string[]; badge: string; popular?: boolean }> =
    rawTiers.map((tier) => ({
      key: tier.key,
      name: tier.name[lang],
      factor: tier.factor,
      perks: tier.perks[lang],
      badge: tier.badge[lang],
      popular: tier.popular,
    }));
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
        <span className="memb-branch-note">{t.memberships.branchPriceNote}</span>
      </div>
      <div className="memb-grid memb-grid-2">
        <div className="memb-vs" aria-hidden="true">VS</div>
        {tiers.map((tier) => {
          const cur = selPeriod[tier.key];
          const heroPrice = calculateMembershipPrice(branch.price, tier.factor, mult[cur]);
          const curName = periods.find((p) => p.key === cur)!.name;
          const hours = tier.key === 'single' ? branch.hours : '5:00 — 23:00';
          const location = tier.key === 'single' ? branch.name + ' · ' + branch.city : t.memberships.allGymsLocation;
          return (
            <div key={tier.key} className={'memb-card' + (tier.popular ? ' popular' : '')}>
              {tier.popular && <div className="pop-badge">{t.memberships.popular}</div>}
              <div className="tier-badge">{tier.badge}</div>
              <h3>{tier.name}</h3>
              <div className={'price' + (pulse[tier.key] ? ' pulse' : '')}>
                <span className="currency">$</span>
                <span className="amount">{heroPrice.toLocaleString()}</span>
                <span className="per">{label[cur]}</span>
              </div>
              <div className="font-mono text-11 text-ml-cream-dim tracking-wide-xl">
                📍 {location} · {hours}
              </div>
              <div className="memb-pills">
                {periods.map((pr) => {
                  const on = pr.key === cur;
                  return (
                    <button type="button" key={pr.key}
                      className={'memb-pill' + (on ? ' selected' : '')}
                      onClick={() => pickPeriod(tier.key, pr.key)}>
                      {pr.name}
                    </button>
                  );
                })}
              </div>
              <ul>
                {tier.perks.map((perk) => <li key={perk}>{perk}</li>)}
              </ul>
              <Link href={`/membership?plan=${tier.key}&period=${cur}&branch=${branch.id}`} className="select-btn block text-center">
                {t.memberships.select} · {curName} →
              </Link>
            </div>
          );
        })}
      </div>
      <div className="partners">
        <div className="partners-head">
          <span className="partners-eyebrow">{t.memberships.partnersEyebrow}</span>
          <h4>{t.memberships.partners}</h4>
          <p>{t.memberships.partnersSub}</p>
          <span className="partners-note">{t.memberships.partnersNote}</span>
        </div>
        <div className="partners-logos">
          <a href="#" className="partner-card tp">
            <span className="ico">T</span>
            <span className="pc-body">
              <b>TotalPass</b>
              <small>{t.memberships.totalPassNote}</small>
            </span>
            <span className="pc-go">{t.memberships.partnerAccepted} ✓</span>
          </a>
          <a href="#" className="partner-card wh">
            <span className="ico">W</span>
            <span className="pc-body">
              <b>Wellhub</b>
              <small>{t.memberships.wellhubNote}</small>
            </span>
            <span className="pc-go">{t.memberships.partnerAccepted} ✓</span>
          </a>
        </div>
      </div>
    </section>
  );
}
