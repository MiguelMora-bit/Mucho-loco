import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/performance', '/checkout', '/en/dashboard', '/en/performance', '/en/checkout'],
      },
    ],
    sitemap: 'https://mucholoco.mx/sitemap.xml',
    host: 'https://mucholoco.mx',
  };
}
