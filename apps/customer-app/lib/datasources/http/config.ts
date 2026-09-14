/**
 * Configuración del datasource HTTP (backend NestJS de `apps/backend`).
 *
 * El swap mock → HTTP se controla con UNA variable de entorno y se decide una
 * sola vez, en `lib/repositories/*.ts`. Ni los componentes ni los stores saben
 * cuál de los dos está activo — esa es justamente la promesa del diseño
 * contract-first (ver "Metodología" en el CLAUDE.md raíz).
 *
 * Ambas son `NEXT_PUBLIC_` porque los repositorios se llaman desde los dos
 * lados: Server Components (`app/[locale]/page.tsx`) y stores de Zustand que
 * corren en el browser (`AnnouncementsBoard`, feed de `Contact`).
 */

/** Backend NestJS, sin slash final. Ej: `http://localhost:3001`. */
export function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
}

/**
 * `true` solo con `NEXT_PUBLIC_DATA_SOURCE=http`. Cualquier otro valor (o su
 * ausencia) deja los mocks activos — el default nunca depende de que el
 * backend esté vivo, así que clonar el repo y correr `pnpm dev` sigue
 * funcionando sin Postgres ni NestJS.
 */
export function isHttpDatasourceEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DATA_SOURCE === 'http';
}
