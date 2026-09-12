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
import { AnnouncementsModule } from './announcements/announcements.module';
import { SocialModule } from './social/social.module';
import { PerformanceModule } from './performance/performance.module';
import { CommunityModule } from './community/community.module';
import { InventoryModule } from './inventory/inventory.module';
import { CounterSalesModule } from './counter-sales/counter-sales.module';
import { CounterMembershipsModule } from './counter-memberships/counter-memberships.module';
import { CashRegisterModule } from './cash-register/cash-register.module';
import { PickupOrdersModule } from './pickup-orders/pickup-orders.module';
import { ReportsModule } from './reports/reports.module';
import { AttendanceModule } from './attendance/attendance.module';
import { PayrollModule } from './payroll/payroll.module';
import { ExpensesModule } from './expenses/expenses.module';
import { RolesGuard } from './auth/roles.guard';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    BranchesModule,
    ProductsModule,
    MembershipsModule,
    UsersModule,
    AnnouncementsModule,
    SocialModule,
    PerformanceModule,
    CommunityModule,
    InventoryModule,
    CounterSalesModule,
    CounterMembershipsModule,
    CashRegisterModule,
    PickupOrdersModule,
    ReportsModule,
    AttendanceModule,
    PayrollModule,
    ExpensesModule,
  ],
  controllers: [AppController],
  providers: [
    // Global: toda ruta pide un ID token válido salvo @Public() — ver auth/public.decorator.ts.
    { provide: APP_GUARD, useClass: CognitoAuthGuard },
    // Después del anterior (el orden de APP_GUARD es el de ejecución): decide
    // si el rol del token alcanza para la ruta — ver auth/roles.decorator.ts.
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
