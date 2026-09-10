import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

// SPA sin servidor propio — estas llamadas salen directo del browser al
// endpoint público de Cognito (App Client sin secreto, sin flujo OAuth/Hosted
// UI). Mismo patrón que owner-panel (ver su lib/cognito.ts), App Client propio.
export const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID as string;

export const cognitoClient = new CognitoIdentityProviderClient({
  region: import.meta.env.VITE_COGNITO_REGION as string,
});
