'use client';

import { useSessionRefresh } from '../lib/hooks/useSessionRefresh';

/** Sin UI — montarlo en páginas protegidas para mantener la sesión viva. Ver useSessionRefresh. */
export function SessionRefresher() {
  useSessionRefresh();
  return null;
}
