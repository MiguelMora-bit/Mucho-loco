import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** @Global porque casi todos los módulos de dominio necesitan PrismaService
 *  — evita reimportar PrismaModule en cada uno (mismo motivo que ConfigModule.forRoot({ isGlobal: true })). */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
