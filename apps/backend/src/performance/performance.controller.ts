import { Controller, Get } from '@nestjs/common';
import type {
  HeatmapLevel,
  PerformanceStat,
  PersonalRecord,
  Workout,
} from '@mucho-loco/types';
import { PerformanceService } from './performance.service';

/** Detrás de CognitoAuthGuard por defecto (no @Public()) — conceptualmente es
 *  contenido de la cuenta ("mi rendimiento"), aunque hoy no personaliza por
 *  socio: ver el comentario sobre este dominio en schema.prisma. */
@Controller('performance')
export class PerformanceController {
  constructor(private performance: PerformanceService) {}

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
  getHeatmap(): Promise<HeatmapLevel[][]> {
    return this.performance.getHeatmap();
  }
}
