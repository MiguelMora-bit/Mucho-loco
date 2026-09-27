'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import type { Lang, NotificationPreferences, Translations } from '@mucho-loco/types';

interface SettingsPaneProps {
  t: Translations;
  active: boolean;
  /** Lo guardado en el backend (spec 053). */
  preferences: NotificationPreferences;
  /** Guarda las tres categorías; si truena, el interruptor vuelve a su lugar. */
  onSavePreferences: (preferences: NotificationPreferences) => Promise<NotificationPreferences>;
}

/** Cada interruptor con su categoría de avisos (spec 053). */
const NOTIF_TOGGLES = [
  { label: 'notifMembership', key: 'membership' },
  { label: 'notifOrderReady', key: 'orders' },
  { label: 'notifPayment', key: 'payments' },
] as const;

export function SettingsPane({ t, active, preferences: saved, onSavePreferences }: SettingsPaneProps) {
  const lang = useLocale() as Lang;
  const router = useRouter();
  const pathname = usePathname();
  const [preferences, setPreferences] = useState(saved);
  const [saveError, setSaveError] = useState(false);

  function handleLangChange(newLang: Lang) {
    router.replace(pathname, { locale: newLang });
  }

  async function toggle(key: keyof NotificationPreferences) {
    const before = preferences;
    const next = { ...before, [key]: !before[key] };
    setPreferences(next);
    setSaveError(false);
    try {
      setPreferences(await onSavePreferences(next));
    } catch (e) {
      console.error(e);
      setPreferences(before);
      setSaveError(true);
    }
  }

  return (
    <div className={'pane' + (active ? ' active' : '')}>
      <div className="max-w-[560px] bg-ml-card border border-ml-border p-6">
        <div className="font-display text-22 mb-4.5">{t.dashboard.settings.title}</div>
        <div className="toggle-row">
          <span className="text-sm text-ml-cream">{t.dashboard.settings.languageLabel}</span>
          <div className="lang-switch">
            <button className={lang === 'es' ? 'active' : ''} onClick={() => handleLangChange('es')}>ES</button>
            <button className={lang === 'en' ? 'active' : ''} onClick={() => handleLangChange('en')}>EN</button>
          </div>
        </div>
        <div className="mt-5 mb-1 font-mono text-11 text-ml-cream-dim uppercase tracking-wide-xl">
          {t.dashboard.settings.notificationsLabel} · {t.dashboard.settings.notificationsSub}
        </div>
        {NOTIF_TOGGLES.map(({ label, key }) => (
          <div key={key} className="toggle-row">
            <span className="text-sm text-ml-cream">{t.dashboard.settings[label]}</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                aria-label={t.dashboard.settings[label]}
                checked={preferences[key]}
                onChange={() => toggle(key)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        ))}
        {saveError && (
          <p role="alert" className="mt-3 text-sm text-ml-red">
            {t.dashboard.settings.notifSaveError}
          </p>
        )}
      </div>
    </div>
  );
}
