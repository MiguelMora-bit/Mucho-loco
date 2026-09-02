'use client';

import { useTranslations } from 'next-intl';
import type { Translations } from '@mucho-loco/types';

export function useT(): Translations {
  const t = useTranslations();
  return {
    nav:         t.raw('nav')         as Translations['nav'],
    hero:        t.raw('hero')        as Translations['hero'],
    stats:       t.raw('stats')       as Translations['stats'],
    branches:    t.raw('branches')    as Translations['branches'],
    coaches:     t.raw('coaches')     as Translations['coaches'],
    memberships: t.raw('memberships') as Translations['memberships'],
    shop:        t.raw('shop')        as Translations['shop'],
    cart:        t.raw('cart')        as Translations['cart'],
    contact:     t.raw('contact')     as Translations['contact'],
    announcements: t.raw('announcements') as Translations['announcements'],
    footer:      t.raw('footer')      as Translations['footer'],
    product:     t.raw('product')     as Translations['product'],
    common:      t.raw('common')      as Translations['common'],
    account:     t.raw('account')     as Translations['account'],
    dashboard:   t.raw('dashboard')   as Translations['dashboard'],
    checkout:    t.raw('checkout')    as Translations['checkout'],
    performance: t.raw('performance') as Translations['performance'],
  };
}
