'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useCartStore, selectCartCount } from '@/lib/stores/cart.store';
import { useT } from '@/lib/hooks/useT';
import { CartDrawer } from '../landing/CartDrawer';
import type { Lang } from '@mucho-loco/types';

export function AccountTopNav() {
  const t = useT();
  const lang = useLocale() as Lang;
  const cartCount = useCartStore(selectCartCount);
  const [cartOpen, setCartOpen] = useState(false);
  const home = lang === 'en' ? '/en' : '/';

  return (
    <>
      <nav className="ck-nav">
        <Link href="/" className="brand">
          <Image src="/assets/bull-head.png" alt="Mucho Loco" width={44} height={44} />
          <div className="name">MUCHO <span>LOCO</span></div>
        </Link>
        <div className="shop-links">
          <a href={`${home}#shop`}>{t.nav.shop}</a>
          <a href={`${home}#branches`}>{t.nav.branches}</a>
          <a href={`${home}#memberships`}>{t.nav.memberships}</a>
          <a href={`${home}#contact`}>{t.nav.contact}</a>
        </div>
        <button className="cart-btn" onClick={() => setCartOpen(true)}>
          🔥 BAG <span className="cart-count">{cartCount}</span>
        </button>
      </nav>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} t={t} lang={lang} />
    </>
  );
}
