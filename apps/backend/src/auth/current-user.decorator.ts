import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from './cognito-auth.guard';

/** Uso: findMe(@CurrentUser() user: IdTokenClaims). Solo válido detrás de
 *  CognitoAuthGuard (request.user no existe en rutas @Public()). */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
  },
);
