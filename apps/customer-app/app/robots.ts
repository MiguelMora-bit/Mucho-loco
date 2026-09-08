import type { MetadataRoute } from 'next';
import { PROTECTED_PATHS } from '@/lib/auth';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const protectedPaths = PROTECTED_PATHS.flatMap((p) => [p, `/en${p}`]);

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', ...protectedPaths],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
