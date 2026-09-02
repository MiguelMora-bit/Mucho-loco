'use client';

import { useEffect, useState } from 'react';
import { getSeenAnnouncementIds } from '../../lib/announcements';
import type { Announcement, Translations } from '@mucho-loco/types';

interface AnnouncementsButtonProps {
  t: Translations;
  onOpen: () => void;
  announcements: Announcement[];
}

export function AnnouncementsButton({ t, onOpen, announcements }: AnnouncementsButtonProps) {
  const [unseen, setUnseen] = useState(0);
  useEffect(() => {
    const seen = getSeenAnnouncementIds();
    // Bridges a browser-only API (localStorage) into React state right after
    // mount, so SSR and the first client render agree before this runs —
    // the standard hydration-safe pattern for this, not a redundant effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnseen(announcements.filter((a) => !seen.includes(a.id)).length);
  }, [announcements]);
  return (
    <button className="announcements-fab" onClick={onOpen} aria-label={t.announcements.board}>
      <span className="announcements-fab-ico">📣</span>
      <span className="announcements-fab-label">{t.announcements.board}</span>
      {unseen > 0 && <span className="announcements-fab-badge">{unseen}</span>}
    </button>
  );
}
