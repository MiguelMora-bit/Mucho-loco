import Image from 'next/image';
import type { Translations } from '@mucho-loco/types';

interface FooterProps {
  t: Translations;
}

export function Footer({ t }: FooterProps) {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <Image src="/assets/bull-head.png" width={64} height={64} className="w-16 h-16 object-contain drop-shadow-[0_0_8px_rgba(225,20,28,0.7)]" alt="" />
            <div className="font-display text-[28px]">MUCHO <span className="text-ml-red">LOCO</span></div>
          </div>
          <p className="text-ml-cream-dim text-sm max-w-[360px]">
            {t.footer.tagline}
          </p>
        </div>
        <div>
          <h4>{t.footer.navigate}</h4>
          <ul>
            <li><a href="#branches">{t.nav.branches}</a></li>
            <li><a href="#memberships">{t.nav.memberships}</a></li>
            <li><a href="#shop">{t.nav.shop}</a></li>
          </ul>
        </div>
        <div>
          <h4>LEGAL</h4>
          <ul>
            <li><a href="#">{t.footer.terms}</a></li>
            <li><a href="#">{t.footer.privacy}</a></li>
            <li><a href="#">{t.footer.rules}</a></li>
          </ul>
        </div>
        <div>
          <h4>PARTNERS</h4>
          <ul>
            <li><a href="#">TotalPass</a></li>
            <li><a href="#">Wellhub</a></li>
            <li><a href="#">{t.footer.corporate}</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 MUCHO LOCO GYM · {t.footer.madeWith}</span>
        <span>v1.0 · MX</span>
      </div>
    </footer>
  );
}
