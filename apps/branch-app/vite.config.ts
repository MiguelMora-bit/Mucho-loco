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
  },
});
