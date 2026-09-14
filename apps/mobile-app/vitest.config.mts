import { defineConfig } from 'vitest/config';

// Solo lógica pura de src/lib (sin imports de React Native): corre en Node,
// igual que los unit tests de los otros tres frontends. La UI se verifica
// corriendo la app (Expo web + Playwright), no aquí.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
