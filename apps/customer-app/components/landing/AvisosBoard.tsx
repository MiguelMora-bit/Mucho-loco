import { useEffect } from 'react';
import { AvisoCard } from './AvisoCard';
import { useAnnouncementsStore } from '../../lib/stores/announcements.store';
import type { Lang, Translations } from '@mucho-loco/types';

interface AvisosBoardProps {
  open: boolean;
  onClose: () => void;
  t: Translations;
  lang: Lang;
}

export function AvisosBoard({ open, onClose, t, lang }: AvisosBoardProps) {
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
      <div className={'avisos-backdrop' + (open ? ' open' : '')} onClick={onClose}></div>
      <aside className={'avisos-board' + (open ? ' open' : '')}>
        <div className="avisos-board-head">
          <div>
            <div className="avisos-board-eyebrow">📣 {t.avisos.board}</div>
            <h3>{t.avisos.title}</h3>
            <p>{t.avisos.sub}</p>
          </div>
          <button onClick={onClose} aria-label={t.avisos.close}>✕</button>
        </div>
        <div className="avisos-board-list">
          {loading && <div className="avisos-empty">{t.common.updating}</div>}
          {!loading && announcements.length === 0 && <div className="avisos-empty">{t.avisos.empty}</div>}
          {!loading && announcements.map((a) => (
            <AvisoCard key={a.id} aviso={a} lang={lang} onAction={onClose} />
          ))}
        </div>
      </aside>
    </>
  );
}
