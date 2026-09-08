import type { MetadataRoute } from 'next';
import { PRODUCTS } from '@/lib/data';
import { SITE_URL, localizedUrl } from '@/lib/seo';

const PUBLIC_PATHS = ['', '/account'];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const publicPages: MetadataRoute.Sitemap = PUBLIC_PATHS.flatMap((path) => [
    {
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1.0 : 0.7,
      alternates: {
        languages: {
          es: localizedUrl(path || '/', 'es'),
          en: localizedUrl(path || '/', 'en'),
          'x-default': localizedUrl(path || '/', 'es'),
        },
      },
    },
  ]);

  const productPages: MetadataRoute.Sitemap = PRODUCTS.flatMap((p) => {
    const path = `/product/${p.id}`;
    return [
      {
        url: `${SITE_URL}${path}`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
        alternates: {
          languages: {
            es: localizedUrl(path, 'es'),
            en: localizedUrl(path, 'en'),
            'x-default': localizedUrl(path, 'es'),
          },
        },
      },
    ];
  });

  return [...publicPages, ...productPages];
}
