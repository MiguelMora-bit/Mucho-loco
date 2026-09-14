import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Lang, Translations } from '@mucho-loco/types';
import { translations } from '@mucho-loco/customer-core/translations';
import { mobileMessages, type MobileMessages } from './mobile-messages';

function deviceLang(): Lang {
  return getLocales()[0]?.languageCode === 'en' ? 'en' : 'es';
}

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

/**
 * Idioma activo. Arranca con el del teléfono; si el socio lo cambia en
 * Cuenta, se recuerda entre aperturas. AsyncStorage es el `localStorage` del
 * móvil: texto plano, bien para preferencias, NUNCA para tokens (esos van en
 * `auth/secure-storage.ts`).
 */
export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: deviceLang(),
      setLang: (lang) => set({ lang }),
    }),
    { name: 'ml-lang', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/**
 * El `useT()` de customer-app, sin next-intl: `t` son los MISMOS textos que la
 * web (de customer-core), `m` los que solo existen aquí.
 */
export function useT(): { t: Translations; m: MobileMessages; lang: Lang } {
  const lang = useLangStore((s) => s.lang);
  return { t: translations[lang], m: mobileMessages[lang], lang };
}
