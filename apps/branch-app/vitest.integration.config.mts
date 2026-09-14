import { defineConfig } from 'vite';

/**
 * Tests de integración: corren contra el backend NestJS REAL (`apps/backend`).
 *
 * Separados de la config de `vite.config.ts` a propósito — `pnpm test` (el que
 * corre CI en cada push) no debe depender de que haya un servidor vivo.
 * Levantar el backend antes:
 *
 *   pnpm --filter @mucho-loco/backend start:dev   # escucha en :3001
 *   pnpm --filter @mucho-loco/branch-app test:integration
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    env: {
      VITE_DATA_SOURCE: 'http',
      VITE_API_URL: process.env.VITE_API_URL ?? 'http://localhost:3001',
    },
  },
});
