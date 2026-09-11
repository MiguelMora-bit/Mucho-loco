'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useT } from '../lib/hooks/useT';
import { useFireCanvas } from '../lib/hooks/useFireCanvas';
import { useCartStore, selectCartCount } from '../lib/stores/cart.store';
import { useAnnouncementsStore } from '../lib/stores/announcements.store';
import { useMembershipTiersStore } from '../lib/stores/membershipTiers.store';
import { useSocialLinksStore } from '../lib/stores/socialLinks.store';
import { useSocialFeedStore } from '../lib/stores/socialFeed.store';
import { getSeenAnnouncementIds, markAnnouncementSeen } from '../lib/announcements';
import { Nav, Hero, Branches, Memberships, Shop, CartDrawer, Contact, Footer, AnnouncementsButton, AnnouncementsBoard, AnnouncementSplash } from './landing';
import type { Branch, Product, Announcement, MembershipTier, Lang, PlanKey } from '@mucho-loco/types';
import type { SocialLink, FeedPost } from '../lib/types/social';

interface LandingProps {
  branches: Branch[];
  products: Product[];
  announcements: Announcement[];
  membershipTiers: MembershipTier[];
  socialLinks: SocialLink[];
  socialFeed: FeedPost[];
}

export default function MuchoLoco({ branches, products, announcements, membershipTiers, socialLinks, socialFeed }: LandingProps) {
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
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [splashAnnouncement, setSplashAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    document.body.classList.toggle('darker', darker);
  }, [darker]);

  // Server already fetched these — seed the stores so children read them
  // without prop-drilling, and without a loader flash on first paint.
  useEffect(() => {
    useAnnouncementsStore.getState().hydrate(announcements);
    useMembershipTiersStore.getState().hydrate(membershipTiers);
    useSocialLinksStore.getState().hydrate(socialLinks);
    useSocialFeedStore.getState().hydrate(socialFeed);
  }, [announcements, membershipTiers, socialLinks, socialFeed]);

  useEffect(() => {
    if (!announcements.length) return;
    const seen = getSeenAnnouncementIds();
    const newest = announcements.find((a) => !seen.includes(a.id));
    if (newest) {
      // 900ms was long enough to collide with a visitor's first intentional click
      // (e.g. going straight for "mi cuenta") — the splash's full-screen backdrop
      // would eat that click to dismiss itself instead of letting it reach the nav.
      const tm = setTimeout(() => setSplashAnnouncement(newest), 3000);
      return () => clearTimeout(tm);
    }
  }, [announcements]);

  function handleLangChange(newLang: Lang) {
    router.replace(pathname, { locale: newLang });
  }

  const dismissSplash = () => {
    if (splashAnnouncement) markAnnouncementSeen(splashAnnouncement.id);
    setSplashAnnouncement(null);
  };

  const cartCount = useCartStore(selectCartCount);
  const memBranch = branches.find((b) => b.id === memBranchId) ?? branches[0];
  const planMultiplier: Record<PlanKey, number> = { visit: 0.12, weekly: 0.35, monthly: 1, quarterly: 2.7, annual: 9.5 };
  const planLabelByLang: Record<Lang, Record<PlanKey, string>> = {
    es: { visit: '/DÍA', weekly: '/SEMANA', monthly: '/MES', quarterly: '/3 MESES', annual: '/AÑO' },
    en: { visit: '/DAY', weekly: '/WEEK', monthly: '/MONTH', quarterly: '/3 MONTHS', annual: '/YEAR' },
  };
  const planLabel = planLabelByLang[lang];

  return (
    <>
      <Nav t={t} lang={lang} setLang={handleLangChange} cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />
      <Hero t={t} fireRef={fireCanvasRef} />
      <Shop t={t} lang={lang} cat={shopCat} setCat={setShopCat} products={products} />
      <Branches t={t} lang={lang} branches={branches} active={activeBranch} setActive={setActiveBranch} />
      <Memberships t={t} branches={branches} branch={memBranch} setBranchId={setMemBranchId} mult={planMultiplier} label={planLabel} lang={lang} />
      <Contact t={t} lang={lang} />
      <Footer t={t} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} t={t} lang={lang} />
      <AnnouncementsButton t={t} onOpen={() => setAnnouncementsOpen(true)} announcements={announcements} />
      <AnnouncementsBoard open={announcementsOpen} onClose={() => setAnnouncementsOpen(false)} t={t} lang={lang} />
      {splashAnnouncement && (
        <AnnouncementSplash
          announcement={splashAnnouncement} t={t} lang={lang}
          onClose={dismissSplash}
          onBoard={() => { dismissSplash(); setAnnouncementsOpen(true); }}
        />
      )}
    </>
  );
}
