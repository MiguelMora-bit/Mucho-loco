import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

// Server-only — no NEXT_PUBLIC_ prefix. Las rutas de auth (app/api/auth/*) son
// las únicas que hablan con Cognito; el browser nunca llama a AWS directo.
export const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID as string;
// Hosted UI — solo la usan las rutas de login social (app/api/auth/social/*)
// para el intercambio de código OAuth. Viene de `terraform output cognito_domain`.
export const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN as string;

export const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.COGNITO_REGION,
});
