import { localizedHref } from '../../lib/i18n-href';
import type { Announcement, Lang, Translations } from '@mucho-loco/types';

interface AnnouncementSplashProps {
  announcement: Announcement;
  t: Translations;
  lang: Lang;
  onClose: () => void;
  onBoard: () => void;
}

export function AnnouncementSplash({ announcement, t, lang, onClose, onBoard }: AnnouncementSplashProps) {
  return (
    <div className="announcement-splash" onClick={onClose}>
      <div className="announcement-splash-card" style={{ '--accent': announcement.accent } as React.CSSProperties} onClick={(e) => e.stopPropagation()}>
        <button className="announcement-splash-close" onClick={onClose} aria-label={t.announcements.close}>✕</button>
        <div className="announcement-splash-glow"></div>
        <div className="announcement-splash-emoji">{announcement.emoji}</div>
        <span className="announcement-splash-badge">{announcement.badge[lang]}</span>
        <h2 className="announcement-splash-title">{announcement.title[lang]}</h2>
        <p className="announcement-splash-sub">{announcement.subtitle[lang]}</p>
        <div className="announcement-splash-meta">
          <span>🗓 {announcement.dateLabel[lang]}</span>
          <span>📍 {announcement.location[lang]}</span>
        </div>
        <p className="announcement-splash-body">{announcement.body[lang]}</p>
        <div className="announcement-splash-actions">
          <a href={localizedHref(announcement.link || '#contact', lang)} className="announcement-splash-cta" onClick={onClose}>{announcement.cta[lang]} →</a>
          <button className="announcement-splash-board" onClick={onBoard}>{t.announcements.seeAll}</button>
        </div>
      </div>
    </div>
  );
}
