import { Module } from '@nestjs/common';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
import { WorkoutsService } from './workouts.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [PerformanceController],
  providers: [PerformanceService, WorkoutsService],
})
export class PerformanceModule {}
