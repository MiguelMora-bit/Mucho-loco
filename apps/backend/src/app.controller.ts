import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/public.decorator';

/** /health, no /  — ruta que revisa el health check del ALB en ECS Fargate
 *  (ver aws-containers), sin depender de ningún dominio de negocio. */
@Controller('health')
export class AppController {
  @Public()
  @Get()
  check() {
    return { status: 'ok' };
  }
}
