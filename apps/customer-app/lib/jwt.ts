interface IdTokenClaims {
  email: string;
  name: string;
}

/**
 * Decodifica el payload de un ID token de Cognito SIN verificar firma.
 * Seguro acá porque el token viene directo de la respuesta de InitiateAuth/
 * ConfirmSignUp en el mismo request server-side — no de un cliente no confiable.
 */
export function decodeIdToken(idToken: string): IdTokenClaims {
  const payload = idToken.split('.')[1];
  const json = Buffer.from(payload, 'base64url').toString('utf-8');
  const claims = JSON.parse(json) as Record<string, unknown>;
  return {
    email: typeof claims.email === 'string' ? claims.email : '',
    name: typeof claims.name === 'string' ? claims.name : '',
  };
}
