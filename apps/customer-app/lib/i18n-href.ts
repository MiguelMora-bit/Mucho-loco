import type { Lang } from '@mucho-loco/types';

/**
 * Prefixes a bare internal path with the locale segment when needed, for use
 * in plain <a> tags that can't go through next-intl's locale-aware <Link>.
 * A same-page hash anchor (e.g. '#contact') is returned unchanged.
 */
export function localizedHref(path: string, lang: Lang): string {
  if (path.startsWith('#')) return path;
  return lang === 'en' ? `/en${path}` : path;
}
