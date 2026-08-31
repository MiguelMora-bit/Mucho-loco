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
    avisos:      t.raw('avisos')      as Translations['avisos'],
  };
}
