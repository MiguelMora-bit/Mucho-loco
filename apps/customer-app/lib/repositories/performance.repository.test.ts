import { describe, it, expect } from 'vitest';
import { performanceRepository } from './performance.repository';

describe('performanceRepository', () => {
  it("getSummary returns the member's numbers, not preformatted text", async () => {
    const summary = await performanceRepository.getSummary('diego@mucholoco.mx');
    expect(typeof summary.workoutsThisMonth).toBe('number');
    expect(summary.streak).toBe(7);
  });

  it("getWorkouts returns the member's logged workouts with derived numbers", async () => {
    const workouts = await performanceRepository.getWorkouts('diego@mucholoco.mx');
    expect(workouts.length).toBeGreaterThan(0);
    expect(workouts[0]).toHaveProperty('date');
    expect(workouts[0]).toHaveProperty('volumeKg');
    expect(workouts[0]).toHaveProperty('durationMinutes');
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
