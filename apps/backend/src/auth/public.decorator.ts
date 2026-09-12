import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca una ruta como exenta del CognitoAuthGuard global (ver main.ts) —
 *  ej. GET /branches, GET /products: catálogo público, sin sesión. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
