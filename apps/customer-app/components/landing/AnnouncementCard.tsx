import { localizedHref } from '../../lib/i18n-href';
import type { Announcement, Lang } from '@mucho-loco/types';

interface AnnouncementCardProps {
  announcement: Announcement;
  lang: Lang;
  onAction: () => void;
}

export function AnnouncementCard({ announcement, lang, onAction }: AnnouncementCardProps) {
  const link = localizedHref(announcement.link || '#contact', lang);
  return (
    <div className="announcement-card" style={{ '--accent': announcement.accent } as React.CSSProperties}>
      <div className="announcement-card-side">
        <span className="announcement-emoji">{announcement.emoji}</span>
      </div>
      <div className="announcement-card-body">
        <div className="announcement-card-top">
          <span className="announcement-badge">{announcement.badge[lang]}</span>
          <span className="announcement-date">{announcement.dateLabel[lang]}</span>
        </div>
        <h4>{announcement.title[lang]}</h4>
        <p className="announcement-sub">{announcement.subtitle[lang]}</p>
        <p className="announcement-body">{announcement.body[lang]}</p>
        <div className="announcement-card-foot">
          <span className="announcement-loc">📍 {announcement.location[lang]}</span>
          <a href={link} className="announcement-cta" onClick={onAction}>{announcement.cta[lang]} →</a>
        </div>
      </div>
    </div>
  );
}
