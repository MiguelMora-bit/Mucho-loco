'use client';

import { useRouter } from '@/i18n/routing';
import { useAuthStore } from '../stores/auth.store';

export function useLogout() {
  const router = useRouter();
  const { clear } = useAuthStore();

  return async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    clear();
    router.push('/');
  };
}
