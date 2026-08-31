import type { MetadataRoute } from 'next';
import { PRODUCTS } from '@/lib/data';

const BASE = 'https://mucholoco.mx';

const PUBLIC_PATHS = ['', '/account'];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const publicPages: MetadataRoute.Sitemap = PUBLIC_PATHS.flatMap((path) => [
    {
      url: `${BASE}${path}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1.0 : 0.7,
      alternates: {
        languages: {
          es: `${BASE}${path}`,
          en: `${BASE}/en${path}`,
        },
      },
    },
  ]);

  const productPages: MetadataRoute.Sitemap = PRODUCTS.flatMap((p) => [
    {
      url: `${BASE}/product/${p.id}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
      alternates: {
        languages: {
          es: `${BASE}/product/${p.id}`,
          en: `${BASE}/en/product/${p.id}`,
        },
      },
    },
  ]);

  return [...publicPages, ...productPages];
}
