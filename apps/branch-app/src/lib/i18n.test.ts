import { describe, it, expect, vi, beforeEach } from 'vitest';

function memoryLocalStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
}

beforeEach(() => {
  vi.resetModules();
});

describe('initial language (read from localStorage at module init)', () => {
  it('defaults to es when nothing is stored', async () => {
    vi.stubGlobal('localStorage', memoryLocalStorage());
    const { default: i18n } = await import('./i18n');
    expect(i18n.language).toBe('es');
  });

  it('picks up a stored en preference', async () => {
    const storage = memoryLocalStorage();
    storage.setItem('ml_lang', 'en');
    vi.stubGlobal('localStorage', storage);
    const { default: i18n } = await import('./i18n');
    expect(i18n.language).toBe('en');
  });

  it('ignores an unknown stored value and falls back to es', async () => {
    const storage = memoryLocalStorage();
    storage.setItem('ml_lang', 'fr');
    vi.stubGlobal('localStorage', storage);
    const { default: i18n } = await import('./i18n');
    expect(i18n.language).toBe('es');
  });

  it('falls back to es when localStorage throws (private/incognito mode)', async () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('SecurityError'); } });
    const { default: i18n } = await import('./i18n');
    expect(i18n.language).toBe('es');
  });
});

describe('setLanguage', () => {
  it('changes the active language and persists it', async () => {
    const storage = memoryLocalStorage();
    vi.stubGlobal('localStorage', storage);
    const { default: i18n, setLanguage } = await import('./i18n');

    setLanguage('en');

    expect(i18n.language).toBe('en');
    expect(storage.getItem('ml_lang')).toBe('en');
  });

  it('still changes the language even if persisting throws', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => { throw new Error('SecurityError'); },
    });
    const { default: i18n, setLanguage } = await import('./i18n');

    expect(() => setLanguage('en')).not.toThrow();
    expect(i18n.language).toBe('en');
  });
});
