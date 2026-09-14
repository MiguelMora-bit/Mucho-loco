import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Los de integración necesitan el backend vivo — corren aparte, con
    // vitest.integration.config.mts.
    exclude: ['**/node_modules/**', 'src/**/*.integration.test.ts'],
    // Fijado, no heredado de .env.local: estos tests ejercen los datasources
    // MOCK a propósito. Sin esto, tener VITE_DATA_SOURCE=http en el entorno
    // local los hace correr contra HTTP y fallan por falta de sesión — pasó.
    // Los de HTTP viven en *.integration.test.ts, con su propia config.
    env: { VITE_DATA_SOURCE: 'mock' },
  },
});
