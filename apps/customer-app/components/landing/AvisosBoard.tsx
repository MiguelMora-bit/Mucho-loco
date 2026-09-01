import { AvisoCard } from './AvisoCard';
import type { Announcement, Lang, Translations } from '@mucho-loco/types';

interface AvisosBoardProps {
  open: boolean;
  onClose: () => void;
  t: Translations;
  lang: Lang;
  announcements: Announcement[];
}

export function AvisosBoard({ open, onClose, t, lang, announcements }: AvisosBoardProps) {
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
          {announcements.length === 0 && <div className="avisos-empty">{t.avisos.empty}</div>}
          {announcements.map((a) => (
            <AvisoCard key={a.id} aviso={a} lang={lang} onAction={onClose} />
          ))}
        </div>
      </aside>
    </>
  );
}
