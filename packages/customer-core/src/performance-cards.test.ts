import { describe, expect, it } from 'vitest';
import type { PerformanceSummary } from '@mucho-loco/types';
import { performanceCards } from './performance-cards';
import { translations } from './translations';

const SUMMARY: PerformanceSummary = {
  workoutsThisMonth: 18,
  workoutsLastMonth: 15,
  volumeThisMonthKg: 94000,
  volumeLastMonthKg: 84000,
  streak: 7,
  bestStreak: 14,
  prsThisMonth: 2,
  prExercisesThisMonth: ['Press de banca', 'Sentadilla'],
};

describe('performanceCards (spec 018)', () => {
  it('builds the four cards from numbers, in the painting language, with palette colors', () => {
    expect(performanceCards(translations.en, 'en', SUMMARY)).toEqual([
      { label: 'WORKOUTS THIS MONTH', value: '18', sub: '+3 vs last month', color: 'orange' },
      { label: 'VOLUME THIS MONTH (KG)', value: '94K', sub: '+12% vs last month', color: 'red' },
      { label: 'CURRENT STREAK (DAYS)', value: '7', sub: 'Best: 14', color: 'gold' },
      { label: 'PRs THIS MONTH', value: '2', sub: 'Press de banca · Sentadilla', color: 'green' },
    ]);
  });

  it('never divides by an empty last month, and says when there are no records', () => {
    const empty = { ...SUMMARY, workoutsThisMonth: 0, workoutsLastMonth: 2, volumeThisMonthKg: 0, volumeLastMonthKg: 0, prsThisMonth: 0, prExercisesThisMonth: [] };
    const [workouts, volume, , prs] = performanceCards(translations.es, 'es', empty);
    expect(workouts.sub).toBe('-2 vs mes anterior');
    expect(volume.sub).toBe('');
    expect(prs.sub).toBe('Sin récords este mes');
  });
});
