import { createRemoteJWKSet, jwtVerify } from 'jose';
import { COGNITO_CLIENT_ID } from './cognito';

interface IdTokenClaims {
  email: string;
  name: string;
  groups: string[];
  exp: number;
}

const issuer = `https://cognito-idp.${import.meta.env.VITE_COGNITO_REGION}.amazonaws.com/${import.meta.env.VITE_COGNITO_USER_POOL_ID}`;
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

/**
 * Verifica firma + expiración + issuer + audience contra el JWKS público de
 * Cognito (jose cachea las llaves). SIN esto, cualquiera podía escribir a mano
 * `ml_owner_session` en localStorage con datos inventados y ProtectedRoute lo
 * aceptaba sin más — ver auditoría de seguridad 2026-09-10.
 */
export async function verifyIdToken(idToken: string): Promise<IdTokenClaims> {
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer,
    audience: COGNITO_CLIENT_ID,
  });
  if (payload.token_use !== 'id') {
    throw new Error('Token is not a Cognito ID token');
  }
  return {
    email: typeof payload.email === 'string' ? payload.email : '',
    name: typeof payload.name === 'string' ? payload.name : '',
    groups: Array.isArray(payload['cognito:groups']) ? (payload['cognito:groups'] as string[]) : [],
    exp: typeof payload.exp === 'number' ? payload.exp : 0,
  };
}
