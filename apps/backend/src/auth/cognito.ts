import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface IdTokenClaims {
  sub: string;
  email: string;
  name: string;
  /** Grupos de Cognito (staff/manager/owner) — su ausencia implica rol customer, ver CLAUDE.md raíz. */
  groups: string[];
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) {
    const issuer = getIssuer();
    jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  }
  return jwks;
}

function getIssuer(): string {
  return `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`;
}

/** Los 3 app clients (web/owner_panel/branch_app) comparten un User Pool
 *  (ver CLAUDE.md raíz) — el backend acepta un ID token de cualquiera de
 *  ellos, no solo el de customer-app, para cuando branch-app/owner-panel
 *  conecten aquí (Fase 5+ de la metodología). */
function getAudiences(): string[] {
  return (process.env.COGNITO_CLIENT_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

/**
 * Mismo criterio de verificación que lib/jwt.ts en customer-app/branch-app/
 * owner-panel (firma + expiración + issuer + audience contra el JWKS
 * público de Cognito, jose cachea las llaves) — aquí es el backend real
 * quien lo hace, no cada frontend por separado.
 */
export async function verifyIdToken(idToken: string): Promise<IdTokenClaims> {
  const audiences = getAudiences();
  if (audiences.length === 0) {
    throw new Error(
      'COGNITO_CLIENT_IDS no está configurado — no se puede verificar el audience del token',
    );
  }

  const { payload } = await jwtVerify(idToken, getJwks(), {
    issuer: getIssuer(),
    audience: audiences,
  });
  if (payload.token_use !== 'id') {
    throw new Error('Token is not a Cognito ID token');
  }
  return {
    sub: String(payload.sub),
    email: typeof payload.email === 'string' ? payload.email : '',
    name: typeof payload.name === 'string' ? payload.name : '',
    groups: Array.isArray(payload['cognito:groups'])
      ? (payload['cognito:groups'] as string[])
      : [],
  };
}
