import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { BranchesModule } from './branches/branches.module';
import { ProductsModule } from './products/products.module';
import { MembershipsModule } from './memberships/memberships.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CognitoAuthGuard } from './auth/cognito-auth.guard';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    BranchesModule,
    ProductsModule,
    MembershipsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    // Global: toda ruta pide un ID token válido salvo @Public() — ver auth/public.decorator.ts.
    { provide: APP_GUARD, useClass: CognitoAuthGuard },
  ],
})
export class AppModule {}
