interface IdTokenClaims {
  email: string;
  name: string;
  groups: string[];
  exp: number;
}

/**
 * Decodifica el payload de un ID token de Cognito SIN verificar firma — mismo
 * módulo duplicado en customer-app/owner-panel a propósito (sin runtime
 * compartido entre apps, ver CLAUDE.md raíz). atob() porque es browser puro.
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
