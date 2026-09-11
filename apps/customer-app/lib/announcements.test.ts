import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSeenAnnouncementIds, markAnnouncementSeen } from './announcements';

function memoryLocalStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
}

describe('announcements (seen tracking)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryLocalStorage());
  });

  it('has no seen ids before anything is marked', () => {
    expect(getSeenAnnouncementIds()).toEqual([]);
  });

  it('marks an id as seen and remembers it', () => {
    markAnnouncementSeen('a1');
    expect(getSeenAnnouncementIds()).toEqual(['a1']);
  });

  it('does not duplicate an id marked seen twice', () => {
    markAnnouncementSeen('a1');
    markAnnouncementSeen('a1');
    expect(getSeenAnnouncementIds()).toEqual(['a1']);
  });

  it('accumulates multiple distinct ids', () => {
    markAnnouncementSeen('a1');
    markAnnouncementSeen('a2');
    expect(getSeenAnnouncementIds()).toEqual(['a1', 'a2']);
  });

  it('falls back to an empty list when localStorage throws (private/incognito mode)', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => { throw new Error('SecurityError'); },
    });
    expect(getSeenAnnouncementIds()).toEqual([]);
    expect(() => markAnnouncementSeen('a1')).not.toThrow();
  });

  it('falls back to an empty list when the stored value is corrupt JSON', () => {
    vi.stubGlobal('localStorage', { ...memoryLocalStorage(), getItem: () => 'not-json' });
    expect(getSeenAnnouncementIds()).toEqual([]);
  });
});
