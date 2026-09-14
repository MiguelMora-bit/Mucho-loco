import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', '.next', 'tests/e2e', 'tests/integration'],
    // Fijado, no heredado de .env.local: estos tests ejercen los datasources
    // MOCK a propósito. Los de HTTP viven en tests/integration/, con su propia
    // config.
    env: { NEXT_PUBLIC_DATA_SOURCE: 'mock' },
  },
});
