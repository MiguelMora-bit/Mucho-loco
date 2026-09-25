import { Controller, Get } from '@nestjs/common';
import type {
  HeatmapLevel,
  PerformanceStat,
  PersonalRecord,
  Workout,
} from '@mucho-loco/types';
import { PerformanceService } from './performance.service';
import { UsersService } from '../users/users.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { IdTokenClaims } from '../auth/cognito';

/** Detrás de CognitoAuthGuard por defecto (no @Public()) — contenido de la
 *  cuenta ("mi rendimiento"). El heatmap es del socio (spec 016); stats,
 *  récords y entrenamientos siguen sembrados hasta que exista captura de
 *  entrenamientos (ver el comentario sobre este dominio en schema.prisma). */
@Controller('performance')
export class PerformanceController {
  constructor(
    private performance: PerformanceService,
    private users: UsersService,
  ) {}

  @Get('stats')
  getStats(): Promise<PerformanceStat[]> {
    return this.performance.getStats();
  }

  @Get('records')
  getPersonalRecords(): Promise<PersonalRecord[]> {
    return this.performance.getPersonalRecords();
  }

  @Get('workouts')
  getWorkouts(): Promise<Workout[]> {
    return this.performance.getWorkouts();
  }

  @Get('heatmap')
  async getHeatmap(@CurrentUser() user: IdTokenClaims): Promise<HeatmapLevel[][]> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    return this.performance.getHeatmap(dbUser.id);
  }
}
