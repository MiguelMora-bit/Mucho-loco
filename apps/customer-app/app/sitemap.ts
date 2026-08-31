import type { MetadataRoute } from 'next';
import { PRODUCTS } from '@/lib/data';

const BASE = 'https://mucholoco.mx';

const PUBLIC_PATHS = ['', '/cuenta'];

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
      url: `${BASE}/producto/${p.id}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
      alternates: {
        languages: {
          es: `${BASE}/producto/${p.id}`,
          en: `${BASE}/en/producto/${p.id}`,
        },
      },
    },
  ]);

  return [...publicPages, ...productPages];
}
