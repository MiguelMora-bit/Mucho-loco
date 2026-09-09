import type { ReactNode } from 'react';

type InfoItem = [string, string, ReactNode?, string?];

interface InfoListProps {
  items: InfoItem[];
}

export function InfoList({ items }: InfoListProps) {
  return (
    <>
      {items.map(([label, val, icon, anim]) => (
        <div key={label} className="info-row mb-3.5">
          <div className="font-mono text-11 text-ml-cream-dim uppercase tracking-wide mb-1 flex items-center gap-1.5">
            {icon && <span className={'info-icon' + (anim ? ' ' + anim : '')}>{icon}</span>}
            {label}
          </div>
          <div className="text-[15px]">{val}</div>
        </div>
      ))}
    </>
  );
}
