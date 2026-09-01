import { localizedHref } from '../../lib/i18n-href';
import type { Announcement, Lang } from '@mucho-loco/types';

interface AvisoCardProps {
  aviso: Announcement;
  lang: Lang;
  onAction: () => void;
}

export function AvisoCard({ aviso, lang, onAction }: AvisoCardProps) {
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
