const SEEN_KEY = 'ml_announcements_seen';

export function getSeenAnnouncementIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
  } catch {
    return [];
  }
}

export function markAnnouncementSeen(id: string): void {
  try {
    const seen = getSeenAnnouncementIds();
    if (!seen.includes(id)) {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, id]));
    }
  } catch {
    // localStorage throws in private/incognito browsing — safe to no-op.
  }
}
