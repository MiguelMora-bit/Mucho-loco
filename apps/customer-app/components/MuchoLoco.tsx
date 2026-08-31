'use client';

import { useState, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useLocale } from 'next-intl';
import { Link, useRouter, usePathname } from '@/i18n/routing';
import { PRODUCT_CATS } from '../lib/data';
import { useT } from '../lib/hooks/useT';
import { startFireCanvas } from '../lib/fire';
import { useCartStore, selectCartCount, selectSubtotal } from '../lib/stores/cart.store';
import { localizedHref } from '../lib/i18n-href';
import { calculateMembershipPrice } from '../lib/pricing';
import type { Branch, Product, CartItem, Announcement, Lang, PlanKey, TierKey, Translations } from '@mucho-loco/types';

const MEXICO_PATH = "M 8,32 L 14,28 L 18,30 L 22,28 L 28,32 L 30,38 L 32,42 L 34,42 L 36,40 L 38,42 L 40,44 L 42,46 L 44,48 L 46,50 L 48,52 L 50,54 L 54,58 L 58,60 L 62,62 L 66,64 L 70,66 L 72,68 L 70,70 L 68,68 L 64,66 L 60,68 L 58,66 L 56,64 L 54,62 L 52,60 L 50,62 L 48,64 L 46,62 L 44,60 L 42,58 L 40,56 L 38,58 L 36,56 L 34,54 L 32,52 L 30,50 L 28,48 L 26,46 L 24,44 L 22,42 L 20,40 L 18,38 L 16,36 L 14,34 L 10,34 Z";


interface LandingProps {
  branches: Branch[];
  products: Product[];
  announcements: Announcement[];
}

export default function MuchoLoco({ branches, products, announcements }: LandingProps) {
  const locale = useLocale();
  const lang = locale as Lang;
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [darker, setDarker] = useState(false);
  const [activeBranch, setActiveBranch] = useState<Branch>(branches[0]);
  const [memBranchId, setMemBranchId] = useState(branches[0].id);
  const [memPlan, setMemPlan] = useState<PlanKey>('monthly');
  const [shopCat, setShopCat] = useState('all');
  const [cartOpen, setCartOpen] = useState(false);
  const fireCanvasRef = useRef<HTMLCanvasElement>(null);
  const [avisosOpen, setAvisosOpen] = useState(false);
  const [splashAviso, setSplashAviso] = useState<Announcement | null>(null);

  useEffect(() => {
    document.body.classList.toggle('darker', darker);
  }, [darker]);

  useEffect(() => {
    if (fireCanvasRef.current) {
      const stop = startFireCanvas(fireCanvasRef.current);
      return stop;
    }
  }, []);

  useEffect(() => {
    if (!announcements.length) return;
    let seen: string[] = [];
    try { seen = JSON.parse(localStorage.getItem('ml_avisos_seen') || '[]'); } catch (e) {}
    const newest = announcements.find((a) => !seen.includes(a.id));
    if (newest) {
      // 900ms was long enough to collide with a visitor's first intentional click
      // (e.g. going straight for "mi cuenta") — the splash's full-screen backdrop
      // would eat that click to dismiss itself instead of letting it reach the nav.
      const tm = setTimeout(() => setSplashAviso(newest), 3000);
      return () => clearTimeout(tm);
    }
  }, [announcements]);

  function handleLangChange(newLang: Lang) {
    router.replace(pathname, { locale: newLang });
  }

  const dismissSplash = () => {
    if (splashAviso) {
      try {
        const seen: string[] = JSON.parse(localStorage.getItem('ml_avisos_seen') || '[]');
        if (!seen.includes(splashAviso.id)) {
          seen.push(splashAviso.id);
          localStorage.setItem('ml_avisos_seen', JSON.stringify(seen));
        }
      } catch (e) {}
    }
    setSplashAviso(null);
  };

  const cartCount = useCartStore(selectCartCount);
  const memBranch = branches.find((b) => b.id === memBranchId) ?? branches[0];
  const planMultiplier: Record<PlanKey, number> = { visit: 0.12, weekly: 0.35, monthly: 1, quarterly: 2.7, annual: 9.5 };
  const planLabel: Record<PlanKey, string> = { visit: '/DÍA', weekly: '/SEMANA', monthly: '/MES', quarterly: '/3 MESES', annual: '/AÑO' };

  return (
    <>
      <Nav t={t} lang={lang} setLang={handleLangChange} cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />
      <Hero t={t} fireRef={fireCanvasRef} />
      <Shop t={t} lang={lang} cat={shopCat} setCat={setShopCat} products={products} />
      <Branches t={t} branches={branches} active={activeBranch} setActive={setActiveBranch} />
      <Memberships t={t} branches={branches} branch={memBranch} setBranchId={setMemBranchId} plan={memPlan} setPlan={setMemPlan} mult={planMultiplier} label={planLabel} lang={lang} />
      <Contact t={t} lang={lang} />
      <Footer t={t} lang={lang} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} t={t} />
      <AvisosButton t={t} lang={lang} onOpen={() => setAvisosOpen(true)} announcements={announcements} />
      <AvisosBoard open={avisosOpen} onClose={() => setAvisosOpen(false)} t={t} lang={lang} announcements={announcements} />
      {splashAviso && (
        <AvisoSplash
          aviso={splashAviso} t={t} lang={lang}
          onClose={dismissSplash}
          onBoard={() => { dismissSplash(); setAvisosOpen(true); }}
        />
      )}
    </>
  );
}

function Nav({ t, lang, setLang, cartCount, onCartOpen }: {
  t: Translations; lang: Lang; setLang: (l: Lang) => void; cartCount: number; onCartOpen: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return (
    <nav className="nav">
      <a href="#top" className="nav-logo">
        <img src="/assets/bull-head.png" alt="Mucho Loco" />
        <div className="name">MUCHO<br /><span>LOCO</span></div>
      </a>
      <div className="nav-links">
        <a href="#shop">{t.nav.shop}</a>
        <a href="#branches">{t.nav.branches}</a>
        <a href="#memberships">{t.nav.memberships}</a>
        <a href="#contact">{t.nav.contact}</a>
      </div>
      <div className="nav-right">
        <div className="lang-switch">
          <button className={lang === 'es' ? 'active' : ''} onClick={() => setLang('es')}>ES</button>
          <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
        </div>
        <Link href="/account" className="login-btn" title="Mi cuenta" aria-label="Mi cuenta">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
          </svg>
          <span>{lang === 'es' ? 'MI CUENTA' : 'ACCOUNT'}</span>
        </Link>
        <button className="cart-btn" onClick={onCartOpen}>
          🔥 BAG <span className="cart-count">{cartCount}</span>
        </button>
        <button className="hamburger" onClick={() => setMenuOpen(true)} aria-label="Menú">
          <span></span><span></span><span></span>
        </button>
      </div>
      <div className={'mobile-menu' + (menuOpen ? ' open' : '')} onClick={closeMenu}>
        <div className="mobile-menu-inner" onClick={(e) => e.stopPropagation()}>
          <button className="mobile-close" onClick={closeMenu} aria-label="Cerrar">✕</button>
          <a href="#shop" onClick={closeMenu}>{t.nav.shop}</a>
          <a href="#branches" onClick={closeMenu}>{t.nav.branches}</a>
          <a href="#memberships" onClick={closeMenu}>{t.nav.memberships}</a>
          <a href="#contact" onClick={closeMenu}>{t.nav.contact}</a>
          <div className="mobile-menu-foot">
            <Link href="/account" className="mobile-cta">🔥 MI CUENTA</Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function Hero({ t, fireRef }: { t: Translations; fireRef: RefObject<HTMLCanvasElement | null> }) {
  return (
    <section className="hero" id="top">
      <div className="hero-bg" />
      <canvas ref={fireRef} className="hero-fire-canvas" />
      <div className="hero-content">
        <div className="hero-eyebrow"><span className="dot"></span>{t.hero.live}</div>
        <h1>
          {t.hero.titleA}<br />
          <span className="stroke">{t.hero.titleB}</span><br />
          <span className="red">{t.hero.titleC}</span>
        </h1>
        <p className="lead">{t.hero.lead}</p>
        <div className="hero-ctas">
          <a href="#memberships" className="btn-primary">{t.hero.ctaJoin}</a>
          <a href="#contact" className="btn-ghost">{t.hero.ctaTour}</a>
        </div>
      </div>
      <div className="hero-mascot">
        <div className="hero-mascot-glow"></div>
        <img src="/assets/bull-head.png" alt="Mucho Loco mascot" />
      </div>
      <div className="hero-stats">
        {t.stats.map((s, i) => (
          <div className="hero-stat" key={i}>
            <div className="num">{s.n}</div>
            <div className="label">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Branches({ t, branches, active, setActive }: {
  t: Translations; branches: Branch[]; active: Branch; setActive: (b: Branch) => void;
}) {
  return (
    <section className="branches" id="branches">
      <div className="section-head">
        <div className="section-eyebrow">{t.branches.eyebrow} · 015 LOCATIONS</div>
        <h2 className="section-title">{t.branches.titleA} <span className="red">{t.branches.titleB}</span></h2>
        <p className="section-sub">{t.branches.sub}</p>
        <div className="mt-6">
          <div className="mascot-quote">
            <img src="/assets/bull-head.png" className="bull" alt="" />
            <span>&quot;{t.branches.quote}&quot;</span>
          </div>
        </div>
      </div>
      <div className="branches-layout">
        <div className="map-wrap">
          <svg className="map-svg" viewBox="0 0 100 75" preserveAspectRatio="none">
            <g className="map-country">
              <path d={MEXICO_PATH} transform="scale(1.1) translate(-5, -5)" />
            </g>
            {branches.map((b) => (
              <g key={b.id} className={'pin' + (active.id === b.id ? ' active' : '')}
                transform={`translate(${b.x * 100}, ${b.y * 75})`}
                onClick={() => setActive(b)}>
                <circle className="pin-glow" r="2" />
                <circle className="pin-body" r="1.4" />
              </g>
            ))}
          </svg>
          <div className="map-legend">
            <span><span className="dot bg-ml-red"></span>SUCURSAL</span>
            <span><span className="dot bg-ml-yellow"></span>SELECCIONADA</span>
          </div>
        </div>
        <div className="branches-list">
          {branches.map((b, i) => (
            <div key={b.id} className={'branch-row' + (active.id === b.id ? ' active' : '')}
              onClick={() => setActive(b)}>
              <div className="num">{String(i + 1).padStart(2, '0')}</div>
              <div className="info">
                <div className="name">{b.name}</div>
                <div className="city">{b.city} · {b.hours}</div>
              </div>
              <div className={'tier ' + b.tier}>{b.tier}</div>
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
              <div className="branch-card-stat"><div className="v">${active.price}</div><div className="l">{t.branches.price} /mes</div></div>
            </div>
            <div className="branch-card-actions">
              <a href="#memberships" className="btn-primary text-sm px-6 py-3">VER PRECIOS</a>
              <a href="#contact" className="btn-ghost text-sm px-6 py-3">{t.branches.viewMore}</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Memberships({ t, branches, branch, setBranchId, plan, setPlan, mult, label, lang }: {
  t: Translations;
  branches: Branch[];
  branch: Branch;
  setBranchId: (id: number) => void;
  plan: PlanKey;
  setPlan: (p: PlanKey) => void;
  mult: Record<PlanKey, number>;
  label: Record<PlanKey, string>;
  lang: Lang;
}) {
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

function Shop({ t, lang, cat, setCat, products }: {
  t: Translations; lang: Lang; cat: string; setCat: (c: string) => void; products: Product[];
}) {
  const cats = PRODUCT_CATS[lang];
  const filtered = cat === 'all' ? products : products.filter((p) => p.cat === cat);
  const { addItem } = useCartStore();
  const items = useCartStore((s) => s.items);

  return (
    <section className="shop" id="shop">
      <div className="section-head">
        <div className="section-eyebrow">{t.shop.eyebrow}</div>
        <h2 className="section-title">{t.shop.titleA} <span className="red">{t.shop.titleB}</span></h2>
        <p className="section-sub">{t.shop.sub}</p>
        <div className="mt-6">
          <div className="mascot-quote">
            <img src="/assets/bull-head.png" className="bull" alt="" />
            <span>&quot;{t.shop.quote}&quot;</span>
          </div>
        </div>
      </div>
      <div className="shop-controls">
        {Object.entries(cats).map(([key, name]) => (
          <button key={key} className={cat === key ? 'active' : ''} onClick={() => setCat(key)}>{name}</button>
        ))}
      </div>
      <div className="shop-grid">
        {filtered.map((p) => {
          const inCart = items.find((c) => c.id === p.id);
          return (
            <div key={p.id} className="product-card">
              <Link href={`/product/${p.id}`} className="no-underline text-inherit flex flex-col flex-1">
                <div className="product-img">
                  {p.tag && <div className={'product-tag ' + p.tag}>{p.tag}</div>}
                  <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="product-body">
                  <div className="product-name">{p.name}</div>
                  <div className="product-flav">{p.flav}</div>
                  <div className="product-row">
                    <div className="product-price">${p.price}</div>
                    <button
                      className={'add-btn' + (inCart ? ' added' : '')}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem(p); }}
                    >
                      {inCart ? `× ${inCart.qty}` : '+ ' + t.shop.add.toUpperCase()}
                    </button>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CartDrawer({ open, onClose, t }: {
  open: boolean; onClose: () => void; t: Translations;
}) {
  const { items: cart, updateQty, removeItem } = useCartStore();
  const subtotal = useCartStore(selectSubtotal);

  return (
    <>
      <div className={'cart-backdrop' + (open ? ' open' : '')} onClick={onClose}></div>
      <aside className={'cart-drawer' + (open ? ' open' : '')}>
        <div className="cart-header">
          <h3>🔥 {t.cart.title}</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="cart-items">
          {cart.length === 0 && <div className="cart-empty">{t.cart.empty}</div>}
          {cart.map((item) => (
            <div key={item.id} className="cart-item">
              <div className="ci-img">
                <img src={item.img} alt="" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="ci-name">{item.name}</div>
                <div className="ci-flav">{item.flav}</div>
                <div className="ci-price">${item.price}</div>
              </div>
              <div className="qty">
                <button onClick={() => updateQty(item.id, -1)}>−</button>
                <span>{item.qty}</span>
                <button onClick={() => updateQty(item.id, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-subtotal">
              <span>{t.cart.subtotal}</span>
              <span className="amount">${subtotal.toLocaleString()}</span>
            </div>
            <Link href="/checkout" className="cart-checkout block text-center no-underline">
              {t.cart.checkout} →
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}

function Contact({ t, lang }: { t: Translations; lang: Lang }) {
  const socials = [
    {
      key: 'instagram', name: 'Instagram', handle: '@mucholoco.fit', followers: '128K', url: '#',
      icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 3.68A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4zm6.41-10.4a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44z" /></svg>,
    },
    {
      key: 'tiktok', name: 'TikTok', handle: '@mucholoco', followers: '342K', url: '#',
      icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1-2.59-2.59 2.59 2.59 0 0 1 3.45-2.44V9.7a5.66 5.66 0 0 0-.86-.07A5.69 5.69 0 1 0 14.95 15V8.86a7.33 7.33 0 0 0 4.28 1.37V7.14a4.28 4.28 0 0 1-2.63-1.32z" /></svg>,
    },
    {
      key: 'youtube', name: 'YouTube', handle: 'Mucho Loco Gym', followers: '56K', url: '#',
      icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.4.55A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.55 9.4.55 9.4.55s7.5 0 9.4-.55a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6z" /></svg>,
    },
    {
      key: 'facebook', name: 'Facebook', handle: '/mucholocogym', followers: '89K', url: '#',
      icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.66 4.53-4.66 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12z" /></svg>,
    },
  ];
  const feed = [
    { net: 'instagram', img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=500&q=70', cap: 'Leg day no perdona 🔥 Roma Sur a tope', likes: '2.4K', ago: '3h', url: '#' },
    { net: 'instagram', img: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=500&q=70', cap: 'Nueva clase de HIIT en Condesa 💥', likes: '1.8K', ago: '9h', url: '#' },
    { net: 'facebook', img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=500&q=70', cap: 'Reto de 30 días: ¿te atreves, bestia?', likes: '973', ago: '1d', url: '#' },
    { net: 'instagram', img: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=500&q=70', cap: 'PR de peso muerto en Santa Fe 🏋️', likes: '3.1K', ago: '1d', url: '#' },
    { net: 'facebook', img: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=500&q=70', cap: 'Coaches nuevos en Interlomas. Bienvenidos 🐂', likes: '654', ago: '2d', url: '#' },
    { net: 'instagram', img: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=500&q=70', cap: 'Domingo de cardio al aire libre ☀️', likes: '2.0K', ago: '3d', url: '#' },
  ];
  const netIcon: Record<string, React.ReactNode> = {
    instagram: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 3.68A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4zm6.41-10.4a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44z" /></svg>,
    facebook: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.66 4.53-4.66 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12z" /></svg>,
  };
  return (
    <section className="contact" id="contact">
      <div className="section-head">
        <div className="section-eyebrow">{t.contact.eyebrow}</div>
        <h2 className="section-title">{t.contact.titleA} <span className="red">{t.contact.titleB}</span></h2>
        <p className="section-sub">{t.contact.sub}</p>
      </div>
      <div className="contact-stack">
        <div className="free-visit">
          <div className="fv-badge"><span className="fv-badge-big">GRATIS</span><span className="fv-badge-small">{lang === 'es' ? '1ª VISITA' : '1ST VISIT'}</span></div>
          <div className="fv-body">
            <h3>{lang === 'es' ? 'TU PRIMERA VISITA ES GRATIS' : 'YOUR FIRST VISIT IS FREE'}</h3>
            <p>{lang === 'es'
              ? 'Entra a entrenar a cualquiera de las 15 sucursales, sin costo. El sistema lo detecta automáticamente cuando tu cuenta es nueva y nunca has tenido una membresía activa — sin tarjeta, sin compromiso.'
              : "Train at any of our 15 locations, on the house. The system detects it automatically when your account is new and you've never had an active membership — no card, no commitment."}</p>
            <div className="fv-actions">
              <Link href="/account" className="btn-primary">{lang === 'es' ? 'CREAR CUENTA GRATIS' : 'CREATE FREE ACCOUNT'}</Link>
              <span className="fv-note">{lang === 'es' ? 'Detección automática · 1 visita por persona' : 'Auto-detected · 1 visit per person'}</span>
            </div>
          </div>
          <div className="fv-steps">
            <div className="fv-step"><span className="fv-step-n">01</span><span>{lang === 'es' ? 'Creas tu cuenta' : 'Create your account'}</span></div>
            <div className="fv-step"><span className="fv-step-n">02</span><span>{lang === 'es' ? 'El sistema valida que eres nuevo' : "System verifies you're new"}</span></div>
            <div className="fv-step"><span className="fv-step-n">03</span><span>{lang === 'es' ? 'Muestras tu QR en recepción' : 'Show your QR at the front desk'}</span></div>
          </div>
        </div>
        <div className="social-feed">
          <div className="sf-head">
            <span className="info-label">{lang === 'es' ? 'Lo último que publicamos' : 'Our latest posts'}</span>
            <span className="feed-live"><i className="sf-dot"></i>{lang === 'es' ? 'En vivo vía API' : 'Live via API'}</span>
          </div>
          <div className="feed-grid">
            {feed.map((p, i) => (
              <a key={i} className="feed-post" href={p.url} target="_blank" rel="noopener noreferrer" aria-label={p.cap}>
                <img src={p.img} alt={p.cap} loading="lazy" />
                <span className={'feed-net ' + p.net}>{netIcon[p.net]}</span>
                <span className="feed-overlay">
                  <span className="feed-cap">{p.cap}</span>
                  <span className="feed-meta"><span>❤ {p.likes}</span><span>{p.ago}</span></span>
                </span>
              </a>
            ))}
          </div>
        </div>
        <div className="social-follow social-full">
          <div className="sf-head">
            <span className="info-label">{t.contact.followUs}</span>
            <span className="sf-daily"><i className="sf-dot"></i>{lang === 'es' ? 'Posteamos todos los días' : 'We post every day'}</span>
          </div>
          <div className="social-grid">
            {socials.map((s) => (
              <a key={s.key} className={'social-card ' + s.key} href={s.url} target="_blank" rel="noopener noreferrer">
                <span className="sc-icon">{s.icon}</span>
                <span className="sc-meta">
                  <span className="sc-name">{s.name}</span>
                  <span className="sc-handle">{s.handle}</span>
                </span>
                <span className="sc-foot"><b>{s.followers}</b>{lang === 'es' ? 'seguidores' : 'followers'}</span>
              </a>
            ))}
          </div>
          <a
            className="sf-wa"
            href={`https://wa.me/525512345678?text=${encodeURIComponent(lang === 'es' ? 'Hola, tengo una duda sobre Mucho Loco Gym' : 'Hi, I have a question about Mucho Loco Gym')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {lang === 'es' ? '¿Dudas? Escríbenos al WhatsApp' : 'Questions? WhatsApp us'} <b>+52 55 1234 5678</b>
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer({ t, lang }: { t: Translations; lang: Lang }) {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <img src="/assets/bull-head.png" className="w-16 h-16 object-contain drop-shadow-[0_0_8px_rgba(225,20,28,0.7)]" alt="" />
            <div className="font-display text-[28px]">MUCHO <span className="text-ml-red">LOCO</span></div>
          </div>
          <p className="text-ml-cream-dim text-sm max-w-[360px]">
            {lang === 'es'
              ? '15 sucursales. 120+ coaches. Una sola filosofía: entrenar como toros sueltos.'
              : '15 locations. 120+ coaches. One philosophy: train like loose bulls.'}
          </p>
        </div>
        <div>
          <h4>{lang === 'es' ? 'NAVEGAR' : 'EXPLORE'}</h4>
          <ul>
            <li><a href="#branches">{t.nav.branches}</a></li>
            <li><a href="#memberships">{t.nav.memberships}</a></li>
            <li><a href="#shop">{t.nav.shop}</a></li>
          </ul>
        </div>
        <div>
          <h4>LEGAL</h4>
          <ul>
            <li><a href="#">{lang === 'es' ? 'Términos' : 'Terms'}</a></li>
            <li><a href="#">{lang === 'es' ? 'Privacidad' : 'Privacy'}</a></li>
            <li><a href="#">{lang === 'es' ? 'Reglamento' : 'Rules'}</a></li>
          </ul>
        </div>
        <div>
          <h4>PARTNERS</h4>
          <ul>
            <li><a href="#">TotalPass</a></li>
            <li><a href="#">Wellhub</a></li>
            <li><a href="#">{lang === 'es' ? 'Empresas' : 'Corporate'}</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 MUCHO LOCO GYM · {lang === 'es' ? 'HECHO CON FUEGO 🔥' : 'MADE WITH FIRE 🔥'}</span>
        <span>v1.0 · MX</span>
      </div>
    </footer>
  );
}

function AvisosButton({ t, lang, onOpen, announcements }: {
  t: Translations; lang: Lang; onOpen: () => void; announcements: Announcement[];
}) {
  const [unseen, setUnseen] = useState(0);
  useEffect(() => {
    let seen: string[] = [];
    try { seen = JSON.parse(localStorage.getItem('ml_avisos_seen') || '[]'); } catch (e) {}
    setUnseen(announcements.filter((a) => !seen.includes(a.id)).length);
  }, [announcements]);
  return (
    <button className="avisos-fab" onClick={onOpen} aria-label={t.avisos.board}>
      <span className="avisos-fab-ico">📣</span>
      <span className="avisos-fab-label">{t.avisos.board}</span>
      {unseen > 0 && <span className="avisos-fab-badge">{unseen}</span>}
    </button>
  );
}

function AvisoCard({ aviso, lang, t, onAction }: {
  aviso: Announcement; lang: Lang; t: Translations; onAction: () => void;
}) {
  const link = localizedHref(aviso.link || '#contact', lang);
  return (
    <div className="aviso-card" style={{ '--accent': aviso.accent } as React.CSSProperties}>
      <div className="aviso-card-side">
        <span className="aviso-emoji">{aviso.emoji}</span>
      </div>
      <div className="aviso-card-body">
        <div className="aviso-card-top">
          <span className="aviso-badge">{aviso.badge[lang]}</span>
          <span className="aviso-date">{aviso.dateLabel[lang]}</span>
        </div>
        <h4>{aviso.title[lang]}</h4>
        <p className="aviso-sub">{aviso.subtitle[lang]}</p>
        <p className="aviso-body">{aviso.body[lang]}</p>
        <div className="aviso-card-foot">
          <span className="aviso-loc">📍 {aviso.location[lang]}</span>
          <a href={link} className="aviso-cta" onClick={onAction}>{aviso.cta[lang]} →</a>
        </div>
      </div>
    </div>
  );
}

function AvisosBoard({ open, onClose, t, lang, announcements }: {
  open: boolean; onClose: () => void; t: Translations; lang: Lang; announcements: Announcement[];
}) {
  return (
    <>
      <div className={'avisos-backdrop' + (open ? ' open' : '')} onClick={onClose}></div>
      <aside className={'avisos-board' + (open ? ' open' : '')}>
        <div className="avisos-board-head">
          <div>
            <div className="avisos-board-eyebrow">📣 {t.avisos.board}</div>
            <h3>{t.avisos.title}</h3>
            <p>{t.avisos.sub}</p>
          </div>
          <button onClick={onClose} aria-label={t.avisos.close}>✕</button>
        </div>
        <div className="avisos-board-list">
          {announcements.length === 0 && <div className="avisos-empty">{t.avisos.empty}</div>}
          {announcements.map((a) => (
            <AvisoCard key={a.id} aviso={a} lang={lang} t={t} onAction={onClose} />
          ))}
        </div>
      </aside>
    </>
  );
}

function AvisoSplash({ aviso, t, lang, onClose, onBoard }: {
  aviso: Announcement; t: Translations; lang: Lang; onClose: () => void; onBoard: () => void;
}) {
  return (
    <div className="aviso-splash" onClick={onClose}>
      <div className="aviso-splash-card" style={{ '--accent': aviso.accent } as React.CSSProperties} onClick={(e) => e.stopPropagation()}>
        <button className="aviso-splash-close" onClick={onClose} aria-label={t.avisos.close}>✕</button>
        <div className="aviso-splash-glow"></div>
        <div className="aviso-splash-emoji">{aviso.emoji}</div>
        <span className="aviso-splash-badge">{aviso.badge[lang]}</span>
        <h2 className="aviso-splash-title">{aviso.title[lang]}</h2>
        <p className="aviso-splash-sub">{aviso.subtitle[lang]}</p>
        <div className="aviso-splash-meta">
          <span>🗓 {aviso.dateLabel[lang]}</span>
          <span>📍 {aviso.location[lang]}</span>
        </div>
        <p className="aviso-splash-body">{aviso.body[lang]}</p>
        <div className="aviso-splash-actions">
          <a href={localizedHref(aviso.link || '#contact', lang)} className="aviso-splash-cta" onClick={onClose}>{aviso.cta[lang]} →</a>
          <button className="aviso-splash-board" onClick={onBoard}>{t.avisos.seeAll}</button>
        </div>
      </div>
    </div>
  );
}
