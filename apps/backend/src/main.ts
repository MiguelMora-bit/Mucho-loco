import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { apiDocsEnabled, setupApiDocs } from './api-docs';

async function bootstrap() {
  // rawBody: conserva los bytes exactos del request. Los necesita la
  // verificación de firma del webhook de Stripe — recalcularla sobre el JSON
  // ya parseado y vuelto a serializar falla siempre (cambian espacios y orden
  // de llaves). Ver payments.controller.ts.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // whitelist+forbidNonWhitelisted: un DTO (ver CreateOrderDto) es la única
  // forma de mandar campos a este API — cualquier campo extra se rechaza en
  // vez de pasar en silencio, mismo espíritu que "nunca confiar en el
  // cliente" que ya aplica el resto de este backend (ver createOrder()).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // customer-app (Vercel + localhost:3000) y las dos SPA de Vite. Se incluyen
  // 5173 Y 5174 porque los dos apps de Vite piden el mismo puerto por default:
  // con branch-app y owner-panel abiertos a la vez —el caso normal cuando se
  // trabaja en los dos— el segundo cae en 5174 y sin esto el navegador le
  // bloquea todas las llamadas por CORS. 8081 es la versión web de mobile-app
  // (Expo), que existe para desarrollar y probar; el app nativo no pasa por
  // CORS.
  app.enableCors({
    origin: (
      process.env.CORS_ORIGINS ??
      'http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:8081'
    ).split(','),
  });

  // Swagger UI en /docs y el documento en /docs-json (spec 056). Apagado en
  // producción salvo API_DOCS=true — ver api-docs.ts.
  if (apiDocsEnabled()) setupApiDocs(app);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
