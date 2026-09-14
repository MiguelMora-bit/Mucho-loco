/**
 * Lee el payload de un JWT SIN verificar la firma.
 *
 * Aquí eso está bien porque el teléfono no toma ninguna decisión de
 * seguridad con estos datos: solo quiere saber el email (para pintarlo y para
 * los mocks) y cuándo vence el token (para refrescarlo antes). Quien sí
 * verifica firma, issuer y audience es el backend, en cada request — ver
 * `apps/backend/src/auth/cognito.ts`.
 *
 * `atob` existe en Hermes desde RN 0.74. El paso por `decodeURIComponent` es
 * para que un nombre con acentos ("Ramírez") no salga como mojibake: `atob`
 * devuelve bytes, no texto UTF-8.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split('.')[1];
  if (!part) throw new Error('No es un JWT');
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
  const utf8 = Array.from(atob(base64), (c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('');
  return JSON.parse(decodeURIComponent(utf8)) as Record<string, unknown>;
}
