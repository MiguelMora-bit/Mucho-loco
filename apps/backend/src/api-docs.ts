import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { PUBLIC_EXTENSION } from './auth/public.decorator';

/**
 * Documentación OpenAPI (spec 056): Swagger UI en `/docs` y el documento en
 * `/docs-json`, generados de los controllers y DTOs — el contrato no se
 * escribe dos veces.
 */
export const API_DOCS_PATH = 'docs';

/**
 * Prendida fuera de producción; en producción solo con `API_DOCS=true` (el
 * contenedor y ECS fijan `NODE_ENV=production`). `API_DOCS=false` la apaga
 * en cualquier lado.
 */
export function apiDocsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  if (env.API_DOCS === 'true') return true;
  if (env.API_DOCS === 'false') return false;
  return env.NODE_ENV !== 'production';
}

const METHODS = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head'] as const;

/**
 * El Bearer de Cognito es el requisito global; `@Public()` marca sus
 * operaciones con `x-public` y aquí se convierten en `security: []` (sin
 * candado). Una sola fuente: el mismo decorador que usa el guard.
 */
export function markPublicOperations(document: OpenAPIObject): OpenAPIObject {
  for (const pathItem of Object.values(document.paths)) {
    for (const method of METHODS) {
      const operation = pathItem[method] as (Record<string, unknown> & { security?: unknown }) | undefined;
      if (!operation?.[PUBLIC_EXTENSION]) continue;
      delete operation[PUBLIC_EXTENSION];
      operation.security = [];
    }
  }
  return document;
}

export function buildApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Mucho Loco Gym API')
    .setDescription(
      'Backend de la tienda, la app del socio, la app de sucursal y el panel del dueño. ' +
        'Las rutas con candado piden el ID token de Cognito; las internas, además, un grupo (staff < manager < owner).',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'ID token de Cognito' },
      'cognito',
    )
    .addSecurityRequirements('cognito')
    .build();
  return markPublicOperations(SwaggerModule.createDocument(app, config));
}

/** Se monta en Express directo, antes del guard global: `/docs` no pide token. */
export function setupApiDocs(app: INestApplication): void {
  SwaggerModule.setup(API_DOCS_PATH, app, () => buildApiDocument(app), {
    swaggerOptions: { persistAuthorization: true },
  });
}
