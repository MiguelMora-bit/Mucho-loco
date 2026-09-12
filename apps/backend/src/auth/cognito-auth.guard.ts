import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { IdTokenClaims } from './cognito';
import { CognitoVerifierService } from './cognito-verifier.service';
import { IS_PUBLIC_KEY } from './public.decorator';

export interface AuthenticatedRequest extends Request {
  user: IdTokenClaims;
}

/** Aplicado globalmente (ver main.ts) — toda ruta requiere un ID token
 *  válido salvo que use @Public() (ver public.decorator.ts). El browser
 *  manda el mismo ID token que hoy guarda en la cookie ml_session /
 *  localStorage según el app; aquí solo cambia el transporte a
 *  "Authorization: Bearer <token>", estándar para una API REST. */
@Injectable()
export class CognitoAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private verifier: CognitoVerifierService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      request.user = await this.verifier.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return true;
  }
}

function extractBearerToken(request: Request): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}
