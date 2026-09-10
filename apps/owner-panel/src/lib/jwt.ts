interface IdTokenClaims {
  email: string;
  name: string;
  groups: string[];
  exp: number;
}

/**
 * Decodifica el payload de un ID token de Cognito SIN verificar firma — igual
 * que customer-app (lib/jwt.ts), duplicado a propósito (sin runtime compartido
 * entre apps, ver CLAUDE.md raíz). Acá con atob() porque es browser puro, sin
 * Buffer de Node.
 */
export function decodeIdToken(idToken: string): IdTokenClaims {
  const payload = idToken.split('.')[1];
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
  );
  const claims = JSON.parse(json) as Record<string, unknown>;
  return {
    email: typeof claims.email === 'string' ? claims.email : '',
    name: typeof claims.name === 'string' ? claims.name : '',
    groups: Array.isArray(claims['cognito:groups']) ? (claims['cognito:groups'] as string[]) : [],
    exp: typeof claims.exp === 'number' ? claims.exp : 0,
  };
}
