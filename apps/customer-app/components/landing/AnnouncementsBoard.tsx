import { useEffect } from 'react';
import { AnnouncementCard } from './AnnouncementCard';
import { useAnnouncementsStore } from '../../lib/stores/announcements.store';
import type { Lang, Translations } from '@mucho-loco/types';

interface AnnouncementsBoardProps {
  open: boolean;
  onClose: () => void;
  t: Translations;
  lang: Lang;
}

export function AnnouncementsBoard({ open, onClose, t, lang }: AnnouncementsBoardProps) {
  const announcements = useAnnouncementsStore((s) => s.data) ?? [];
  const loading = useAnnouncementsStore((s) => s.loading);
  const fetchAnnouncements = useAnnouncementsStore((s) => s.fetch);

  // Every time the board is reopened it re-hits the "API" — a good spot to
  // see the loader without needing a dedicated refresh button.
  useEffect(() => {
    if (open) fetchAnnouncements();
  }, [open, fetchAnnouncements]);

  return (
    <>
      <div className={'announcements-backdrop' + (open ? ' open' : '')} onClick={onClose}></div>
      <aside className={'announcements-board' + (open ? ' open' : '')}>
        <div className="announcements-board-head">
          <div>
            <div className="announcements-board-eyebrow">📣 {t.announcements.board}</div>
            <h3>{t.announcements.title}</h3>
            <p>{t.announcements.sub}</p>
          </div>
          <button onClick={onClose} aria-label={t.announcements.close}>✕</button>
        </div>
        <div className="announcements-board-list">
          {loading && <div className="announcements-empty">{t.common.updating}</div>}
          {!loading && announcements.length === 0 && <div className="announcements-empty">{t.announcements.empty}</div>}
          {!loading && announcements.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} lang={lang} onAction={onClose} />
          ))}
        </div>
      </aside>
    </>
  );
}
