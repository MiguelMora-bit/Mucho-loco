import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * Tests de integración: corren contra el backend NestJS REAL (`apps/backend`)
 * y su Postgres, no contra mocks ni contra `fetch` stubeado.
 *
 * Separados de `vitest.config.ts` a propósito — `pnpm test` (el que corre CI)
 * no debe depender de que haya una base y un servidor vivos. Levantar el
 * backend antes:
 *
 *   pnpm --filter @mucho-loco/backend start:dev   # escucha en :3001
 *   pnpm --filter customer-app test:integration
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    // El primer request paga el arranque en frío de Nest/Prisma.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    env: {
      NEXT_PUBLIC_DATA_SOURCE: 'http',
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
    },
  },
});
