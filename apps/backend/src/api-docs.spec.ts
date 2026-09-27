import type { OpenAPIObject } from '@nestjs/swagger';
import { apiDocsEnabled, markPublicOperations } from './api-docs';

// Spec 056: la documentación OpenAPI.
describe('apiDocsEnabled', () => {
  it('is on outside production and off in production', () => {
    expect(apiDocsEnabled({})).toBe(true);
    expect(apiDocsEnabled({ NODE_ENV: 'development' })).toBe(true);
    expect(apiDocsEnabled({ NODE_ENV: 'production' })).toBe(false);
  });

  it('API_DOCS wins either way', () => {
    expect(apiDocsEnabled({ NODE_ENV: 'production', API_DOCS: 'true' })).toBe(true);
    expect(apiDocsEnabled({ API_DOCS: 'false' })).toBe(false);
  });
});

describe('markPublicOperations', () => {
  it('drops the global lock from @Public() operations and leaves the rest alone', () => {
    const document = {
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      security: [{ cognito: [] }],
      paths: {
        '/products': { get: { 'x-public': true, responses: {} } },
        '/payroll/payslips': { get: { responses: {} } },
        '/payments/stripe/webhook': { post: { 'x-public': true, responses: {} } },
      },
    } as unknown as OpenAPIObject;

    const marked = markPublicOperations(document);

    expect(marked.paths['/products'].get).toEqual({ security: [], responses: {} });
    expect(marked.paths['/payments/stripe/webhook'].post?.security).toEqual([]);
    expect(marked.paths['/payroll/payslips'].get).toEqual({ responses: {} });
  });
});
