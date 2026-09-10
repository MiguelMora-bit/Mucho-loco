import type { ReactNode } from 'react';
import { AccountTopNav, Sidebar } from '@/components/dashboard';
import { SessionRefresher } from '@/components/SessionRefresher';

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <SessionRefresher />
      <AccountTopNav />
      <div className="panel-layout grid grid-cols-[260px_1fr] flex-1 min-h-0">
        <Sidebar />
        <main className="bg-ml-black overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
