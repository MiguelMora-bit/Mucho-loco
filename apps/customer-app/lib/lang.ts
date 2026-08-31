import { cookies } from 'next/headers';
import type { Lang } from '@mucho-loco/types';

export const LANG_COOKIE = 'ml_lang';

export function getLang(): Lang {
  const val = cookies().get(LANG_COOKIE)?.value;
  return val === 'en' ? 'en' : 'es';
}
