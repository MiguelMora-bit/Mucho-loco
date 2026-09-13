import { SESSION_COOKIE } from '../../auth';

/**
 * Lee el ID token de la cookie `ml_session`. Es el `getToken` de `accountApi`.
 *
 * `next/headers` se importa de forma dinámica, no arriba del archivo, por dos
 * razones: solo existe en el servidor (los repositorios de cuenta corren en
 * Server Components y Route Handlers, nunca en el browser — ver los callers
 * en `app/[locale]/(account)/` y `app/api/`), y así los tests unitarios pueden
 * importar este módulo sin arrastrar el runtime de Next.
 */
export async function cookieSessionToken(): Promise<string | undefined> {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}
