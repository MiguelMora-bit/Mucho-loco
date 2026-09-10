import { createRemoteJWKSet, jwtVerify } from 'jose';
import { COGNITO_CLIENT_ID } from './cognito';

interface IdTokenClaims {
  email: string;
  name: string;
}

const issuer = `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`;
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

/**
 * Verifica firma + expiración + issuer + audience contra el JWKS público de
 * Cognito (jose cachea las llaves). SIN esto, cualquiera podía editar la
 * cookie ml_session a mano con un JWT fabricado y suplantar a otro usuario —
 * decodeIdToken() nunca comprobaba que Cognito realmente hubiera emitido el
 * token. Ver auditoría de seguridad 2026-09-10.
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
  };
}
