import { apiBaseUrl } from '../../lib/datasources/http/config';

/**
 * Falla temprano y con instrucciones si el backend no está arriba — sin esto,
 * cada test explota por separado con un `fetch failed` que no dice qué hacer.
 */
export async function requireBackend(): Promise<void> {
  const base = apiBaseUrl();
  try {
    const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return;
    throw new Error(`respondió ${res.status}`);
  } catch (cause) {
    throw new Error(
      `El backend no responde en ${base} (${cause instanceof Error ? cause.message : cause}).\n` +
        'Levantarlo antes de correr estos tests:\n' +
        '  pnpm --filter @mucho-loco/backend start:dev',
    );
  }
}
