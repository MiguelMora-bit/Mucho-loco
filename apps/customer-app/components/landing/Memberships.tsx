'use client';

import { useState } from 'react';
import { Link } from '@/i18n/routing';
import { resolveMembershipTierPrice } from '../../lib/pricing';
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
  const tiers: Array<{ key: TierKey; name: string; factor: number; basePrice?: number; perks: string[]; badge: string; popular?: boolean }> =
    rawTiers.map((tier) => ({
      key: tier.key,
      name: tier.name[lang],
      factor: tier.factor,
      basePrice: tier.basePrice,
      perks: tier.perks[lang],
      badge: tier.badge[lang],
      popular: tier.popular,
    }));
  const singleTier = tiers.find((tier) => tier.key === 'single');
  const allTier = tiers.find((tier) => tier.key === 'all');
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
      {singleTier && allTier && (() => {
        const curSingle = selPeriod.single;
        const curAll = selPeriod.all;
        const singlePrice = resolveMembershipTierPrice(singleTier, branch.price, mult[curSingle]);
        const allPrice = resolveMembershipTierPrice(allTier, branch.price, mult[curAll]);
        return (
          <div className="memb-grid memb-grid-2">
            <div className="memb-card memb-card-single">
              <div className="memb-card-head">
                <div className="tier-badge">{singleTier.badge}</div>
                <div className="memb-branch-select">
                  <select value={branch.id} onChange={(e) => setBranchId(parseInt(e.target.value))} aria-label={t.memberships.choose}>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name} · {b.city}</option>)}
                  </select>
                  <span className="memb-branch-arrow">▾</span>
                </div>
              </div>
              <h3>{singleTier.name}</h3>
              <div className="memb-price-row">
                <div className={'price' + (pulse.single ? ' pulse' : '')}>
                  <span className="currency">$</span>
                  <span className="amount">{singlePrice.toLocaleString()}</span>
                  <span className="per">{label[curSingle]}</span>
                </div>
                <span className="memb-price-tag dynamic">🔁 {t.memberships.branchPriceNote}</span>
              </div>
              <div className="font-mono text-11 text-ml-cream-dim tracking-wide-xl">
                📍 {branch.name} · {branch.city} · {branch.hours}
              </div>
              <div className="memb-pills">
                {periods.map((pr) => {
                  const on = pr.key === curSingle;
                  return (
                    <button type="button" key={pr.key}
                      className={'memb-pill' + (on ? ' selected' : '')}
                      onClick={() => pickPeriod('single', pr.key)}>
                      {pr.name}
                    </button>
                  );
                })}
              </div>
              <ul>
                {singleTier.perks.map((perk) => <li key={perk}>{perk}</li>)}
              </ul>
              <Link href={`/membership?plan=single&period=${curSingle}&branch=${branch.id}`} className="select-btn block text-center">
                {t.memberships.select} →
              </Link>
            </div>

            <div className="memb-card popular memb-card-all">
              <div className="pop-badge">{t.memberships.popular}</div>
              <div className="tier-badge">{allTier.badge}</div>
              <h3>{allTier.name}</h3>
              <div className={'price' + (pulse.all ? ' pulse' : '')}>
                <span className="currency">$</span>
                <span className="amount">{allPrice.toLocaleString()}</span>
                <span className="per">{label[curAll]}</span>
              </div>
              <span className="memb-price-tag fixed">🔒 {t.memberships.allGymsFixedPrice}</span>
              <div className="font-mono text-11 text-ml-cream-dim tracking-wide-xl">
                📍 {t.memberships.allGymsLocation} · 5:00 — 23:00
              </div>
              <div className="memb-pills">
                {periods.map((pr) => {
                  const on = pr.key === curAll;
                  return (
                    <button type="button" key={pr.key}
                      className={'memb-pill' + (on ? ' selected' : '')}
                      onClick={() => pickPeriod('all', pr.key)}>
                      {pr.name}
                    </button>
                  );
                })}
              </div>
              <ul>
                {allTier.perks.map((perk) => <li key={perk}>{perk}</li>)}
              </ul>
              <Link href={`/membership?plan=all&period=${curAll}&branch=${branch.id}`} className="select-btn block text-center">
                {t.memberships.select} →
              </Link>
            </div>
          </div>
        );
      })()}
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
