import { defineConfig } from '@playwright/test';

/**
 * Recorre la versión web del app móvil en viewport de teléfono.
 *
 * No hay simulador en esta máquina (sin Xcode ni Android SDK), así que los
 * flujos se verifican aquí. Lo que la web NO prueba — llavero, brillo, Intl de
 * Hermes, deep link de Stripe — sigue necesitando un teléfono con Expo Go
 * (ver "Testing" en CLAUDE.md del app).
 *
 * Levanta Expo web si no hay uno corriendo ya. Siempre en modo mock (datos Y
 * auth): el flujo tiene que poder recorrerse sin backend ni User Pool.
 *
 * `--no-dev` es lo que aísla el spec de un `.env.local` real. En desarrollo,
 * el módulo virtual de env de Expo (`@expo/metro-config`, transform worker)
 * carga `.env`, `.env.development`, `.env.local` y `.env.development.local` y
 * los mezcla ENCIMA de las variables de la shell — ni `EXPO_PUBLIC_AUTH=mock`
 * en el comando ni `EXPO_NO_DOTENV=1` lo evitan. Con un `.env.local` apuntando
 * a Cognito, el spec terminó registrando un usuario real (verificado,
 * 2026-09-12). En producción las variables se incrustan con Babel desde
 * `process.env`, y ahí `EXPO_NO_DOTENV=1` sí deja fuera los archivos.
 */
export default defineConfig({
  testDir: './tests/e2e',
  // El primer bundle de Metro tarda; el recorrido completo son ~20 pasos.
  timeout: 240_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8081',
    viewport: { width: 390, height: 844 },
    // es-MX: expo-localization lee el idioma del navegador; en inglés
    // arrancaría con en.json y los asserts en español fallarían.
    locale: 'es-MX',
    trace: 'retain-on-failure',
  },
  webServer: {
    // --clear: en producción las EXPO_PUBLIC_* quedan incrustadas en lo
    // compilado, y Metro lo cachea; sin esto podría servir un bundle de una
    // corrida anterior con otros valores.
    command:
      'CI=1 EXPO_NO_DOTENV=1 EXPO_PUBLIC_DATA_SOURCE=mock EXPO_PUBLIC_AUTH=mock npx expo start --web --port 8081 --no-dev --clear',
    url: 'http://localhost:8081',
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
