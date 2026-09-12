import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Lang } from '@mucho-loco/types';

/**
 * `?lang=es|en`, por default `es`.
 *
 * Hace falta donde el backend arma un string de display a partir de un campo
 * `LocalizedString` (nombre de producto en inventario y tickets). En el resto
 * del API no aparece: los endpoints devuelven el `LocalizedString` completo y
 * el frontend elige — solo cuando el backend tiene que APLANAR a un string
 * necesita saber a qué idioma.
 */
export const RequestLang = createParamDecorator((_data, ctx: ExecutionContext): Lang => {
  const req = ctx.switchToHttp().getRequest<Request>();
  return req.query.lang === 'en' ? 'en' : 'es';
});
