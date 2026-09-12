import type { Workout, PerformanceStat, PersonalRecord, HeatmapLevel } from '../types/performance';
import { PerformanceMockDatasource } from '../datasources/mock/performance.mock';
import { PerformanceHttpDatasource } from '../datasources/http/performance.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

export interface IPerformanceRepository {
  getStats(): Promise<PerformanceStat[]>;
  getPersonalRecords(): Promise<PersonalRecord[]>;
  getWorkouts(): Promise<Workout[]>;
  getHeatmap(): Promise<HeatmapLevel[][]>;
}

export const performanceRepository: IPerformanceRepository = isHttpDatasourceEnabled()
  ? new PerformanceHttpDatasource()
  : new PerformanceMockDatasource();
