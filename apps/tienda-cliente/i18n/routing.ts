import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['es', 'en'] as const,
  defaultLocale: 'es',
  localePrefix: 'as-needed',
});

export const { Link, redirect, useRouter, usePathname } =
  createNavigation(routing);
