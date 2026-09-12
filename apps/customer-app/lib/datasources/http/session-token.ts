import { SESSION_COOKIE } from '../../auth';

/** De dónde sale el ID token que se manda al backend. Inyectable para poder testear sin Next. */
export type TokenProvider = () => Promise<string | undefined>;

/**
 * Lee el ID token de la cookie `ml_session`.
 *
 * `next/headers` se importa de forma dinámica, no arriba del archivo, por dos
 * razones: solo existe en el servidor (los datasources que lo usan corren en
 * Server Components y Route Handlers, nunca en el browser — ver los callers
 * en `app/[locale]/(account)/` y `app/api/`), y así los tests unitarios pueden
 * importar este módulo sin arrastrar el runtime de Next.
 */
export const cookieSessionToken: TokenProvider = async () => {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
};

/** El backend responde 401 sin token — mejor fallar aquí con un mensaje que diga por qué. */
export async function requireToken(getToken: TokenProvider, path: string): Promise<string> {
  const token = await getToken();
  if (!token) {
    throw new Error(
      `Sin sesión (cookie ${SESSION_COOKIE}) para llamar ${path} — el middleware debió redirigir a /account antes de llegar aquí`,
    );
  }
  return token;
};
