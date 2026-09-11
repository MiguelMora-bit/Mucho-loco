'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useT } from '../../lib/hooks/useT';
import type { Branch, Lang, Translations } from '@mucho-loco/types';

// The loading placeholder renders before BranchesMap itself has mounted, so
// it calls useT() on its own instead of receiving t as a prop.
function MapLoading() {
  const t = useT();
  return (
    <div className="map-wrap map-wrap-empty">
      <p>{t.branches.loadingMap}</p>
    </div>
  );
}

// Google Maps' SDK is heavy and entirely browser-only — keep it out of the
// initial bundle for a section that starts below the fold.
const BranchesMap = dynamic(
  () => import('./BranchesMap').then((m) => m.BranchesMap),
  {
    ssr: false,
    loading: MapLoading,
  }
);

interface BranchesProps {
  t: Translations;
  lang: Lang;
  branches: Branch[];
  active: Branch;
  setActive: (b: Branch) => void;
}

export function Branches({ t, lang, branches, active, setActive }: BranchesProps) {
  return (
    <section className="branches" id="branches">
      <div className="section-head">
        <div className="section-eyebrow">{t.branches.eyebrow} · 015 LOCATIONS</div>
        <h2 className="section-title">{t.branches.titleA} <span className="red">{t.branches.titleB}</span></h2>
        <p className="section-sub">{t.branches.sub}</p>
        <div className="mt-6">
          <div className="mascot-quote">
            <Image src="/assets/bull-head.png" width={64} height={64} className="bull" alt="" />
            <span>&quot;{t.branches.quote}&quot;</span>
          </div>
        </div>
      </div>
      <div className="branches-layout">
        <BranchesMap t={t} branches={branches} active={active} setActive={setActive} />
        <div className="branches-list">
          {branches.map((b, i) => (
            <div key={b.id} className={'branch-row' + (active.id === b.id ? ' active' : '')}
              onClick={() => setActive(b)}>
              <div className="num">{String(i + 1).padStart(2, '0')}</div>
              <div className="info">
                <div className="name">{b.name}</div>
                <div className="city">{b.city} · {b.hours}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className={'tier ' + b.tier}>{b.tier}</div>
                {b.promo && <span className="promo-tag">{t.branches.promoBadge}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="branch-detail">
        <div className="branch-card">
          <div className="branch-card-img" style={{ backgroundImage: `url(${active.img})` }}>
            <div className="badge-num">{String(branches.findIndex((b) => b.id === active.id) + 1).padStart(2, '0')}</div>
            <div className="badge-tier">{active.tier}</div>
          </div>
          <div className="branch-card-body">
            <h3>{active.name}<br /><span className="text-ml-cream-dim text-[0.5em]">{active.city}</span></h3>
            <div className="addr">📍 {active.addr}<br />📞 {active.phone}<br />🕐 {t.branches.hours}: {active.hours}</div>
            <div className="branch-card-stats">
              <div className="branch-card-stat"><div className="v">{active.classes}</div><div className="l">{t.branches.classes}/sem</div></div>
              <div className="branch-card-stat">
                {active.promo ? (
                  <>
                    <div className="v">${Math.round(active.price * (1 - active.promo.discountPercent / 100))}</div>
                    <div className="l"><span className="line-through opacity-60">${active.price}</span> {t.branches.price}/mes</div>
                  </>
                ) : (
                  <>
                    <div className="v">${active.price}</div>
                    <div className="l">{t.branches.price} /mes</div>
                  </>
                )}
              </div>
              {active.promo && (
                <div className="branch-card-stat">
                  <div className="v text-ml-red">-{active.promo.discountPercent}%</div>
                  <div className="l">{active.promo.label[lang]}</div>
                </div>
              )}
            </div>
            {active.promo && (
              <p className="mt-3 font-mono text-11 text-ml-cream-dim">🔥 {active.promo.detail[lang]}</p>
            )}
            <div className="branch-card-actions">
              <a href="#memberships" className="btn-primary text-sm px-6 py-3">{t.branches.viewPrices}</a>
              <a href="#contact" className="btn-ghost text-sm px-6 py-3">{t.branches.viewMore}</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
