/**
 * En web no hay llavero: expo-secure-store no tiene implementación ahí.
 *
 * La versión web de este app existe solo para desarrollar y verificar con
 * Playwright — no se publica (la web del socio es customer-app) —, así que
 * localStorage basta. En iOS/Android Metro usa `secure-storage.ts`.
 */
export const secureStorage = {
  get: async (key: string): Promise<string | null> => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: async (key: string, value: string): Promise<void> => {
    localStorage.setItem(key, value);
  },
  remove: async (key: string): Promise<void> => {
    localStorage.removeItem(key);
  },
};
