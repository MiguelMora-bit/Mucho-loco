import { Outlet, NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../../lib/i18n';
import type { Lang } from '@mucho-loco/types';

export function AppShell() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-ml-border bg-ml-black-2 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/assets/bull-head.png" alt="Mucho Loco" className="h-8 w-8 object-contain" />
          <span className="font-bold text-lg tracking-wide">
            MUCHO <span className="text-ml-red">LOCO</span>
          </span>
          <span className="text-ml-cream-dim text-sm font-mono">· {t('header.label')}</span>
        </div>
        <nav className="flex items-center gap-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              'px-3 py-1.5 rounded text-sm font-medium transition-colors ' +
              (isActive ? 'bg-ml-red text-ml-cream' : 'text-ml-cream-dim hover:text-ml-cream')
            }
          >
            {t('nav.summary')}
          </NavLink>
          <NavLink
            to="/expenses"
            className={({ isActive }) =>
              'px-3 py-1.5 rounded text-sm font-medium transition-colors ' +
              (isActive ? 'bg-ml-red text-ml-cream' : 'text-ml-cream-dim hover:text-ml-cream')
            }
          >
            {t('nav.expenses')}
          </NavLink>
          <NavLink
            to="/transfers"
            className={({ isActive }) =>
              'px-3 py-1.5 rounded text-sm font-medium transition-colors ' +
              (isActive ? 'bg-ml-red text-ml-cream' : 'text-ml-cream-dim hover:text-ml-cream')
            }
          >
            {t('nav.transfers')}
          </NavLink>
          <NavLink
            to="/payroll"
            className={({ isActive }) =>
              'px-3 py-1.5 rounded text-sm font-medium transition-colors ' +
              (isActive ? 'bg-ml-red text-ml-cream' : 'text-ml-cream-dim hover:text-ml-cream')
            }
          >
            {t('nav.payroll')}
          </NavLink>
          <div className="flex gap-1 ml-2">
            <button
              onClick={() => setLanguage('es')}
              className={'px-2 py-1 rounded text-xs font-mono ' + (lang === 'es' ? 'bg-ml-red text-ml-cream' : 'text-ml-cream-dim hover:text-ml-cream')}
            >
              ES
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={'px-2 py-1 rounded text-xs font-mono ' + (lang === 'en' ? 'bg-ml-red text-ml-cream' : 'text-ml-cream-dim hover:text-ml-cream')}
            >
              EN
            </button>
          </div>
        </nav>
      </header>
      <main className="flex-1 px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
