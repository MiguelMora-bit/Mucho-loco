'use client';

import { type ReactNode, useEffect } from 'react';
import { useCartStore } from '@/lib/stores/cart.store';

export function Providers({ children }: { children: ReactNode }) {
  // Rehydrate cart from localStorage after first paint to avoid SSR mismatch
  useEffect(() => {
    useCartStore.persist.rehydrate();
  }, []);

  return <>{children}</>;
}
