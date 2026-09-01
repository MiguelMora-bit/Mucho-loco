import type { ReactNode } from 'react';
import { Sidebar } from '@/components/dashboard';

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="panel-layout grid grid-cols-[260px_1fr] min-h-screen">
      <Sidebar />
      <main className="bg-ml-black">{children}</main>
    </div>
  );
}
