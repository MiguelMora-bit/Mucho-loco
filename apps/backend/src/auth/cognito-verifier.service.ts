import { Injectable } from '@nestjs/common';
import { verifyIdToken, type IdTokenClaims } from './cognito';

/** Envuelve verifyIdToken() como provider inyectable — así los tests e2e
 *  pueden hacer overrideProvider(CognitoVerifierService) para simular un
 *  usuario autenticado sin depender de un User Pool de Cognito real (no hay
 *  uno vivo hoy, ver "Infra destruida" en el CLAUDE.md raíz), sin tener que
 *  mockear el módulo completo con jest.mock(). El guard (CognitoAuthGuard)
 *  sigue siendo el mismo en prod y en test — solo cambia esta pieza. */
@Injectable()
export class CognitoVerifierService {
  verify(idToken: string): Promise<IdTokenClaims> {
    return verifyIdToken(idToken);
  }
}
