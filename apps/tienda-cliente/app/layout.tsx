import type { ReactNode } from 'react';

// Root layout — html/body are provided by app/[locale]/layout.tsx
export default function RootLayout({ children }: { children: ReactNode }) {
  return children as React.JSX.Element;
}
