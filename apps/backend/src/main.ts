import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  // customer-app (Vercel + localhost:3000), branch-app/owner-panel (Vite,
  // localhost:5173) — las 3 SPAs/Next app que van a llamar este API.
  app.enableCors({
    origin: (
      process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:5173'
    ).split(','),
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
