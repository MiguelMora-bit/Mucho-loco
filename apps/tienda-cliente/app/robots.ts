import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/panel', '/rendimiento', '/checkout', '/en/panel', '/en/rendimiento', '/en/checkout'],
      },
    ],
    sitemap: 'https://mucholoco.mx/sitemap.xml',
    host: 'https://mucholoco.mx',
  };
}
