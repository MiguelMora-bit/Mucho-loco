import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import type {
  HeatmapLevel,
  PerformanceSummary,
  PersonalRecord,
  Workout,
} from '@mucho-loco/types';
import { PerformanceService } from './performance.service';
import { WorkoutsService } from './workouts.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { UsersService } from '../users/users.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { IdTokenClaims } from '../auth/cognito';

/** Detrás de CognitoAuthGuard por defecto (no @Public()) — contenido de la
 *  cuenta ("mi rendimiento"), todo del socio: entrenamientos (spec 017),
 *  resumen y récords derivados de ellos (spec 018), heatmap de su asistencia
 *  (spec 016). */
@Controller('performance')
export class PerformanceController {
  constructor(
    private performance: PerformanceService,
    private workouts: WorkoutsService,
    private users: UsersService,
  ) {}

  /** La pestaña Resumen, en números (spec 018): el texto lo pone quien pinta. */
  @Get('summary')
  async getSummary(@CurrentUser() user: IdTokenClaims): Promise<PerformanceSummary> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    return this.performance.getSummary(dbUser.id);
  }

  @Get('records')
  async getPersonalRecords(@CurrentUser() user: IdTokenClaims): Promise<PersonalRecord[]> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    return this.performance.getPersonalRecords(dbUser.id);
  }

  /** Los entrenamientos que registró el socio (spec 017), el más reciente primero. */
  @Get('workouts')
  async getWorkouts(@CurrentUser() user: IdTokenClaims): Promise<Workout[]> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    return this.workouts.list(dbUser.id);
  }

  @Post('workouts')
  async logWorkout(
    @CurrentUser() user: IdTokenClaims,
    @Body() dto: CreateWorkoutDto,
  ): Promise<Workout> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    return this.workouts.log(dbUser.id, dto);
  }

  @Delete('workouts/:id')
  @HttpCode(204)
  async deleteWorkout(@CurrentUser() user: IdTokenClaims, @Param('id') id: string): Promise<void> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    await this.workouts.remove(dbUser.id, id);
  }

  @Get('heatmap')
  async getHeatmap(@CurrentUser() user: IdTokenClaims): Promise<HeatmapLevel[][]> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    return this.performance.getHeatmap(dbUser.id);
  }
}
