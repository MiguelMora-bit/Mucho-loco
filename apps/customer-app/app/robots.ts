import type { MetadataRoute } from 'next';
import { PROTECTED_PATHS } from '@/lib/auth';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PROTECTED_PATHS.flatMap((p) => [p, `/en${p}`]),
      },
    ],
    sitemap: 'https://mucholoco.mx/sitemap.xml',
    host: 'https://mucholoco.mx',
  };
}
