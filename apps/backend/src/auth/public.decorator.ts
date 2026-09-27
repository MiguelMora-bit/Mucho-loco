import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiExtension } from '@nestjs/swagger';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca de la documentación OpenAPI: `api-docs.ts` la vuelve `security: []` (spec 056). */
export const PUBLIC_EXTENSION = 'x-public';

/** Marca una ruta como exenta del CognitoAuthGuard global (ver main.ts) —
 *  ej. GET /branches, GET /products: catálogo público, sin sesión. También
 *  la deja sin candado en `/docs`. */
export const Public = () => applyDecorators(SetMetadata(IS_PUBLIC_KEY, true), ApiExtension(PUBLIC_EXTENSION, true));
