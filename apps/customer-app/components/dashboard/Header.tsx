import type { Translations } from '@mucho-loco/types';
import type { PaneKey } from './types';

interface HeaderProps {
  t: Translations;
  pane: PaneKey;
  avatarInitial: string;
}

export function Header({ t, pane, avatarInitial }: HeaderProps) {
  return (
    <div className="sticky top-0 z-50 flex items-center gap-4.5 px-8 py-4.5 bg-[rgba(10,6,6,0.85)] backdrop-blur-[10px] border-b border-ml-border">
      <div>
        <div className="font-mono text-11 text-ml-muted uppercase tracking-wide-xl">{t.dashboard.brandLabel}</div>
        <h1 className="font-display text-[32px] leading-none">{t.dashboard.nav[pane]}</h1>
      </div>
      <span className="flex-1" />
      <div className="w-[42px] h-[42px] rounded-full bg-ml-red grid place-items-center font-display text-xl text-ml-cream">
        {avatarInitial}
      </div>
    </div>
  );
}
