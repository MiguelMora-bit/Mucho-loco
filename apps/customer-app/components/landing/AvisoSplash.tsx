import { localizedHref } from '../../lib/i18n-href';
import type { Announcement, Lang, Translations } from '@mucho-loco/types';

interface AvisoSplashProps {
  aviso: Announcement;
  t: Translations;
  lang: Lang;
  onClose: () => void;
  onBoard: () => void;
}

export function AvisoSplash({ aviso, t, lang, onClose, onBoard }: AvisoSplashProps) {
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
