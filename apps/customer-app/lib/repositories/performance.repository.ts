import type { Workout, PerformanceStat, PersonalRecord, HeatmapLevel } from '../types/performance';
import { PerformanceMockDatasource } from '../datasources/mock/performance.mock';

export interface IPerformanceRepository {
  getStats(): Promise<PerformanceStat[]>;
  getPersonalRecords(): Promise<PersonalRecord[]>;
  getWorkouts(): Promise<Workout[]>;
  getHeatmap(): Promise<HeatmapLevel[][]>;
}

export const performanceRepository: IPerformanceRepository = new PerformanceMockDatasource();
