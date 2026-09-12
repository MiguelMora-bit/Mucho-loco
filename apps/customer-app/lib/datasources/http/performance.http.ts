import type { Workout, PerformanceStat, PersonalRecord, HeatmapLevel } from '../../types/performance';
import type { IPerformanceRepository } from '../../repositories/performance.repository';
import { apiGet } from './client';
import { cookieSessionToken, requireToken, type TokenProvider } from './session-token';

/**
 * `/performance/*` — detrás del guard de Cognito aunque todavía no filtre por
 * socio (el backend sirve el mismo seed a todos; ver el tratamiento especial
 * de este dominio en apps/backend/CLAUDE.md). Manda el token igual, para no
 * tener que tocar este archivo el día que sí personalice.
 */
export class PerformanceHttpDatasource implements IPerformanceRepository {
  constructor(private readonly getToken: TokenProvider = cookieSessionToken) {}

  private async token(path: string): Promise<string> {
    return requireToken(this.getToken, path);
  }

  async getStats(): Promise<PerformanceStat[]> {
    return apiGet<PerformanceStat[]>('/performance/stats', {
      token: await this.token('/performance/stats'),
    });
  }

  async getPersonalRecords(): Promise<PersonalRecord[]> {
    return apiGet<PersonalRecord[]>('/performance/records', {
      token: await this.token('/performance/records'),
    });
  }

  async getWorkouts(): Promise<Workout[]> {
    return apiGet<Workout[]>('/performance/workouts', {
      token: await this.token('/performance/workouts'),
    });
  }

  async getHeatmap(): Promise<HeatmapLevel[][]> {
    return apiGet<HeatmapLevel[][]>('/performance/heatmap', {
      token: await this.token('/performance/heatmap'),
    });
  }
}
