import { describe, expect, it } from 'vitest';
import { heatmapFromVisits } from './heatmap';

// Viernes 25 de septiembre de 2026, 12:00 en CDMX: la última columna arranca el lunes 21.
const NOW = new Date('2026-09-25T18:00:00.000Z');
const visit = (visitedAt: string, durationMinutes: number | null = null) => ({ visitedAt, durationMinutes });

describe('heatmapFromVisits (spec 016)', () => {
  it('is 52 weeks of 7 days, empty without visits', () => {
    const grid = heatmapFromVisits([], NOW);
    expect(grid).toHaveLength(52);
    expect(grid.every((week) => week.length === 7)).toBe(true);
    expect(grid.flat().every((level) => level === '')).toBe(true);
  });

  it('marks today in the last column, Monday first, and leaves the rest of the week empty', () => {
    const grid = heatmapFromVisits([visit('2026-09-25T14:00:00.000Z')], NOW);
    expect(grid[51][4]).toBe('l2');
    expect(grid[51][5]).toBe('');
  });

  // 23:30 del domingo 20 en CDMX ya es lunes 21 en UTC.
  it('uses the Mexico City day, not the UTC one', () => {
    const grid = heatmapFromVisits([visit('2026-09-21T05:30:00.000Z', 30)], NOW);
    expect(grid[50][6]).toBe('l1');
    expect(grid[51][0]).toBe('');
  });

  it('grades by duration and drops what is older than 52 weeks', () => {
    const grid = heatmapFromVisits(
      [visit('2026-09-14T15:00:00.000Z', 120), visit('2026-09-15T15:00:00.000Z', 60), visit('2025-09-28T15:00:00.000Z', 60)],
      NOW,
    );
    expect(grid[50][0]).toBe('l3');
    expect(grid[50][1]).toBe('l2');
    expect(grid.flat().filter((level) => level !== '')).toHaveLength(2);
  });
});
