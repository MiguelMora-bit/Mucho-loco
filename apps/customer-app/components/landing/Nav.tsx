'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import type { Lang, Translations } from '@mucho-loco/types';

interface NavProps {
  t: Translations;
  lang: Lang;
  setLang: (l: Lang) => void;
  cartCount: number;
  onCartOpen: () => void;
}

export function Nav({ t, lang, setLang, cartCount, onCartOpen }: NavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return (
    <nav className="nav">
      <a href="#top" className="nav-logo">
        <Image src="/assets/bull-head.png" alt="Mucho Loco" width={48} height={48} />
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
