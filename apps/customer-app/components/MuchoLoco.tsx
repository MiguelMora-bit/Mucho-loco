'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useT } from '../lib/hooks/useT';
import { useFireCanvas } from '../lib/hooks/useFireCanvas';
import { useCartStore, selectCartCount } from '../lib/stores/cart.store';
import { getSeenAnnouncementIds, markAnnouncementSeen } from '../lib/announcements';
import { Nav, Hero, Branches, Memberships, Shop, CartDrawer, Contact, Footer, AvisosButton, AvisosBoard, AvisoSplash } from './landing';
import type { Branch, Product, Announcement, Lang, PlanKey } from '@mucho-loco/types';

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
  const [shopCat, setShopCat] = useState('all');
  const [cartOpen, setCartOpen] = useState(false);
  const fireCanvasRef = useFireCanvas();
  const [avisosOpen, setAvisosOpen] = useState(false);
  const [splashAviso, setSplashAviso] = useState<Announcement | null>(null);

  useEffect(() => {
    document.body.classList.toggle('darker', darker);
  }, [darker]);

  useEffect(() => {
    if (!announcements.length) return;
    const seen = getSeenAnnouncementIds();
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
    if (splashAviso) markAnnouncementSeen(splashAviso.id);
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
      <Memberships t={t} branches={branches} branch={memBranch} setBranchId={setMemBranchId} mult={planMultiplier} label={planLabel} lang={lang} />
      <Contact t={t} lang={lang} />
      <Footer t={t} lang={lang} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} t={t} />
      <AvisosButton t={t} onOpen={() => setAvisosOpen(true)} announcements={announcements} />
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
