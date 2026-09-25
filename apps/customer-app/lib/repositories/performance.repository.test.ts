import { describe, it, expect } from 'vitest';
import { performanceRepository } from './performance.repository';

describe('performanceRepository', () => {
  it('getStats returns labeled stat cards', async () => {
    const stats = await performanceRepository.getStats();
    expect(stats.length).toBeGreaterThan(0);
    for (const s of stats) {
      expect(s).toHaveProperty('lbl');
      expect(s).toHaveProperty('num');
    }
  });

  it('getWorkouts returns workout entries', async () => {
    const workouts = await performanceRepository.getWorkouts();
    expect(workouts.length).toBeGreaterThan(0);
    expect(workouts[0]).toHaveProperty('date');
    expect(workouts[0]).toHaveProperty('duration');
  });

  it('getHeatmap returns a 52-week x 7-day grid of valid levels', async () => {
    const heatmap = await performanceRepository.getHeatmap('diego@mucholoco.mx');
    expect(heatmap).toHaveLength(52);
    for (const week of heatmap) {
      expect(week).toHaveLength(7);
      for (const level of week) {
        expect(['', 'l1', 'l2', 'l3']).toContain(level);
      }
    }
  });
});
