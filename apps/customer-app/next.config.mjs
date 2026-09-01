import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
  },
  webpack(config) {
    // next-intl/plugin arrastra un extractor interno con un import() dinámico
    // que el resolver de build-dependencies de webpack no puede seguir.
    // No afecta el build ni el cache de módulos, solo ese log de infraestructura.
    config.infrastructureLogging = { level: 'error' };
    return config;
  },
};

export default withNextIntl(nextConfig);
