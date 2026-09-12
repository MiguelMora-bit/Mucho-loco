/**
 * Configuración del datasource HTTP (backend NestJS de `apps/backend`).
 *
 * Mismo diseño que `customer-app/lib/datasources/http/config.ts`: una sola
 * variable decide, y el default es mock — clonar el repo y correr `pnpm dev`
 * tiene que seguir funcionando sin Postgres ni backend.
 *
 * `VITE_` y no `NEXT_PUBLIC_` porque esto es Vite: las variables se leen de
 * `import.meta.env` y se inlinean en el bundle al construir.
 */

/** Backend NestJS, sin slash final. Ej: `http://localhost:3001`. */
export function apiBaseUrl(): string {
  return String(import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
}

/** `true` solo con `VITE_DATA_SOURCE=http`. Cualquier otro valor deja los mocks. */
export function isHttpDatasourceEnabled(): boolean {
  return import.meta.env.VITE_DATA_SOURCE === 'http';
}
