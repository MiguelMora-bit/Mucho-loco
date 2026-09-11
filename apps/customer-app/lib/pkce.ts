import { randomBytes, createHash } from 'node:crypto';

function base64url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

/** state = nonce (comparado contra la cookie, protege CSRF) + next path (a dónde volver tras el login). */
export function generateState(nextPath: string): { state: string; nonce: string } {
  const nonce = base64url(randomBytes(16));
  return { state: `${nonce}.${encodeURIComponent(nextPath)}`, nonce };
}

export function parseState(state: string): { nonce: string; nextPath: string } | null {
  const dot = state.indexOf('.');
  if (dot === -1) return null;
  return { nonce: state.slice(0, dot), nextPath: decodeURIComponent(state.slice(dot + 1)) };
}

/** Evita open-redirect: solo rutas internas, nunca `//host` (protocol-relative) ni de vuelta a /api. */
export function isSafeNextPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/api');
}
