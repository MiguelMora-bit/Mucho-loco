import { createHmac } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { CognitoVerifierService } from '../src/auth/cognito-verifier.service';
import type { IdTokenClaims } from '../src/auth/cognito';

/**
 * E2E del webhook de WhatsApp.
 *
 * A diferencia del resto, aquí NO se sobreescribe el provider: lo que se está
 * probando es justamente la verificación de firma real (HMAC del cuerpo crudo
 * contra el app secret), que es lo único que protege un endpoint público.
 */
const APP_SECRET = 'secreto-de-prueba';
const VERIFY_TOKEN = 'token-de-alta';

function sign(body: string): string {
  return `sha256=${createHmac('sha256', APP_SECRET).update(Buffer.from(body)).digest('hex')}`;
}

describe('WhatsApp webhook (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.WHATSAPP_APP_SECRET = APP_SECRET;
    process.env.WHATSAPP_VERIFY_TOKEN = VERIFY_TOKEN;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CognitoVerifierService)
      .useValue({
        verify: (token: string): Promise<IdTokenClaims> =>
          Promise.resolve({ sub: token, email: token, name: token, groups: [] }),
      })
      .compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    delete process.env.WHATSAPP_APP_SECRET;
    delete process.env.WHATSAPP_VERIFY_TOKEN;
    await app.close();
  });

  describe('GET (handshake de alta)', () => {
    // Meta llama una vez al dar de alta el webhook y espera el challenge
    // devuelto tal cual, en texto plano.
    it('echoes the challenge when the verify token matches', async () => {
      const res = await request(app.getHttpServer())
        .get(`/notifications/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=1234567`)
        .expect(200);

      expect(res.text).toBe('1234567');
    });

    it('refuses a wrong verify token', async () => {
      await request(app.getHttpServer())
        .get('/notifications/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=falso&hub.challenge=1234567')
        .expect(403);
    });

    it('refuses a mode other than subscribe', async () => {
      await request(app.getHttpServer())
        .get(`/notifications/whatsapp/webhook?hub.mode=otra&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=1`)
        .expect(403);
    });
  });

  describe('POST (eventos)', () => {
    const payload = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });

    it('accepts an event signed with the app secret', async () => {
      await request(app.getHttpServer())
        .post('/notifications/whatsapp/webhook')
        .set('x-hub-signature-256', sign(payload))
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);
    });

    // 200 aunque la firma no cuadre: Meta desactiva un webhook que responde
    // errores de forma sostenida, así que alguien mandando basura no debe
    // poder tirarnos el canal. El evento se descarta, que es lo que importa.
    it('answers 200 to a bad signature but does not act on it', async () => {
      const res = await request(app.getHttpServer())
        .post('/notifications/whatsapp/webhook')
        .set('x-hub-signature-256', 'sha256=deadbeef')
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(res.body).toEqual({ received: true });
    });

    it('answers 200 with no signature header at all', async () => {
      await request(app.getHttpServer())
        .post('/notifications/whatsapp/webhook')
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);
    });

    // Una firma válida para OTRO cuerpo no sirve: se firma el contenido, no la
    // petición.
    it('rejects a signature computed over a different body', async () => {
      const res = await request(app.getHttpServer())
        .post('/notifications/whatsapp/webhook')
        .set('x-hub-signature-256', sign('{"otra":"cosa"}'))
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(res.body).toEqual({ received: true });
    });

    it('is reachable with no bearer token, since Meta has none', async () => {
      await request(app.getHttpServer())
        .post('/notifications/whatsapp/webhook')
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);
    });
  });
});
