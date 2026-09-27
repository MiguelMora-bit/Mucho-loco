import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { OpenAPIObject } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { CognitoVerifierService } from '../src/auth/cognito-verifier.service';
import type { IdTokenClaims } from '../src/auth/cognito';
import { setupApiDocs } from '../src/api-docs';

/**
 * Spec 056: la documentación OpenAPI se genera del AppModule completo. No
 * valida el contenido de cada ruta (eso lo hacen los demás e2e), sino que el
 * documento exista sin token, esté completo y marque bien la seguridad.
 */
describe('API docs (e2e)', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CognitoVerifierService)
      .useValue({
        verify: (token: string): Promise<IdTokenClaims> =>
          Promise.resolve({ sub: token, email: token, name: token, groups: [] }),
      })
      .compile();
    app = moduleRef.createNestApplication();
    setupApiDocs(app);
    await app.init();

    document = (await request(app.getHttpServer()).get('/docs-json').expect(200)).body as OpenAPIObject;
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the Swagger UI without a token', async () => {
    const res = await request(app.getHttpServer()).get('/docs').redirects(1).expect(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('documents the routes added by specs 050–055', () => {
    for (const path of [
      '/payroll/periods/next',
      '/cash-register/audit',
      '/users/me/notification-preferences',
      '/expenses/{id}',
      '/branches/{branchId}/attendance/forgotten-entries',
      '/attendance/entries/{entryId}/close',
    ]) {
      expect(document.paths).toHaveProperty([path]);
    }
    expect(Object.keys(document.paths).length).toBeGreaterThan(60);
  });

  it('requires the Cognito bearer everywhere except @Public() routes', () => {
    expect(document.components?.securitySchemes?.cognito).toMatchObject({ type: 'http', scheme: 'bearer' });
    expect(document.security).toEqual([{ cognito: [] }]);

    expect(document.paths['/products'].get?.security).toEqual([]);
    expect(document.paths['/payments/stripe/webhook'].post?.security).toEqual([]);
    expect(document.paths['/payroll/payslips'].get?.security).toBeUndefined();
    expect(JSON.stringify(document)).not.toContain('x-public');
  });

  it('groups the operations by controller', () => {
    expect(document.paths['/payroll/periods/next'].post?.tags).toEqual(['Payroll']);
  });
});
