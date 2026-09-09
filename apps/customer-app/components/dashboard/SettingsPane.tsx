'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import type { Lang, Translations } from '@mucho-loco/types';

interface SettingsPaneProps {
  t: Translations;
  active: boolean;
}

const NOTIF_KEYS = ['notifMembership', 'notifOrderReady', 'notifPayment'] as const;

export function SettingsPane({ t, active }: SettingsPaneProps) {
  const lang = useLocale() as Lang;
  const router = useRouter();
  const pathname = usePathname();
  const [notifs, setNotifs] = useState<Record<(typeof NOTIF_KEYS)[number], boolean>>({
    notifMembership: true,
    notifOrderReady: true,
    notifPayment: true,
  });

  function handleLangChange(newLang: Lang) {
    router.replace(pathname, { locale: newLang });
  }

  function toggleNotif(key: (typeof NOTIF_KEYS)[number]) {
    setNotifs((prev) => ({ ...prev, [key]: !prev[key] }));
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
        {NOTIF_KEYS.map((key) => (
          <div key={key} className="toggle-row">
            <span className="text-sm text-ml-cream">{t.dashboard.settings[key]}</span>
            <label className="toggle-switch">
              <input type="checkbox" checked={notifs[key]} onChange={() => toggleNotif(key)} />
              <span className="toggle-slider" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
