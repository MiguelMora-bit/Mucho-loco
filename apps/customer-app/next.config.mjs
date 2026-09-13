import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Paquetes de workspace source-only (TypeScript sin compilar) con código de
  // runtime — mocks, catálogo, datasources, cliente HTTP. @mucho-loco/types no
  // lo necesita porque solo exporta tipos, que se borran al compilar.
  transpilePackages: ['@mucho-loco/customer-core', '@mucho-loco/api-client'],
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
