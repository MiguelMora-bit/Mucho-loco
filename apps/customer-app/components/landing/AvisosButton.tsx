'use client';

import { useEffect, useState } from 'react';
import { getSeenAnnouncementIds } from '../../lib/announcements';
import type { Announcement, Translations } from '@mucho-loco/types';

interface AvisosButtonProps {
  t: Translations;
  onOpen: () => void;
  announcements: Announcement[];
}

export function AvisosButton({ t, onOpen, announcements }: AvisosButtonProps) {
  const [unseen, setUnseen] = useState(0);
  useEffect(() => {
    const seen = getSeenAnnouncementIds();
    setUnseen(announcements.filter((a) => !seen.includes(a.id)).length);
  }, [announcements]);
  return (
    <button className="avisos-fab" onClick={onOpen} aria-label={t.avisos.board}>
      <span className="avisos-fab-ico">📣</span>
      <span className="avisos-fab-label">{t.avisos.board}</span>
      {unseen > 0 && <span className="avisos-fab-badge">{unseen}</span>}
    </button>
  );
}
