import {
  branchesThisMonth,
  heatmapOf,
  currentStreak,
  longestStreak,
  mexicoDay,
  visitsLastMonth,
  visitsThisMonth,
} from './visit-stats';

// 2026-09-25 12:00 en CDMX (UTC-6).
const NOW = new Date('2026-09-25T18:00:00.000Z');

describe('mexicoDay', () => {
  it('counts the day in Mexico City, not UTC', () => {
    // 23:30 del 25 en CDMX ya es el 26 en UTC.
    expect(mexicoDay(new Date('2026-09-26T05:30:00.000Z'))).toBe('2026-09-25');
    expect(mexicoDay(new Date('2026-09-26T06:00:00.000Z'))).toBe('2026-09-26');
  });
});

describe('visitsThisMonth', () => {
  it('counts only the days of the current month', () => {
    expect(visitsThisMonth(['2026-09-25', '2026-09-02', '2026-08-31'], NOW)).toBe(2);
  });

  it('uses the month in Mexico City at the turn of the month', () => {
    // 30 de septiembre a las 23:00 en CDMX: sigue siendo septiembre.
    expect(visitsThisMonth(['2026-09-30'], new Date('2026-10-01T05:00:00.000Z'))).toBe(1);
  });
});

describe('currentStreak', () => {
  it('counts consecutive days ending today', () => {
    expect(currentStreak(['2026-09-25', '2026-09-24', '2026-09-23', '2026-09-20'], NOW)).toBe(3);
  });

  // No se rompe antes de que el socio llegue hoy.
  it('still counts a streak that ended yesterday', () => {
    expect(currentStreak(['2026-09-24', '2026-09-23'], NOW)).toBe(2);
  });

  it('is zero when the last visit was two days ago', () => {
    expect(currentStreak(['2026-09-23', '2026-09-22'], NOW)).toBe(0);
    expect(currentStreak([], NOW)).toBe(0);
  });

  it('crosses the turn of the month', () => {
    expect(currentStreak(['2026-10-01', '2026-09-30'], new Date('2026-10-01T18:00:00.000Z'))).toBe(2);
  });
});

describe('visitsLastMonth (spec 013)', () => {
  it('counts the days of the previous month', () => {
    expect(visitsLastMonth(['2026-09-02', '2026-08-31', '2026-08-01', '2026-07-31'], NOW)).toBe(2);
  });

  it('goes back to December of the previous year in January', () => {
    expect(visitsLastMonth(['2025-12-31', '2026-01-02'], new Date('2026-01-10T18:00:00.000Z'))).toBe(1);
  });
});

describe('longestStreak (spec 013)', () => {
  it('finds the longest run of consecutive days, wherever it is', () => {
    const days = ['2026-09-25', '2026-09-24', '2026-09-10', '2026-09-09', '2026-09-08', '2026-09-07', '2026-09-01'];
    expect(longestStreak(days)).toBe(4);
  });

  it('crosses months and ignores order', () => {
    expect(longestStreak(['2026-09-01', '2026-08-30', '2026-08-31'])).toBe(3);
    expect(longestStreak([])).toBe(0);
  });
});

describe('branchesThisMonth (spec 013)', () => {
  it('counts distinct branches with an entry this month only', () => {
    const visits = [
      { day: '2026-09-25', branchId: 1 },
      { day: '2026-09-20', branchId: 3 },
      { day: '2026-09-18', branchId: 1 },
      { day: '2026-08-30', branchId: 7 },
    ];
    expect(branchesThisMonth(visits, NOW)).toBe(2);
  });
});

describe('heatmapOf (spec 016)', () => {
  // NOW = viernes 25 de septiembre de 2026: la última columna arranca el lunes 21.
  const cell = (grid: ReturnType<typeof heatmapOf>, week: number, day: number) => grid[week][day];

  it('is 52 weeks of 7 days, Monday first, ending in the current week', () => {
    const grid = heatmapOf([], NOW);
    expect(grid).toHaveLength(52);
    expect(grid.every((week) => week.length === 7)).toBe(true);
    expect(grid.flat().every((level) => level === '')).toBe(true);
  });

  it('marks today, and leaves the rest of the week empty', () => {
    const grid = heatmapOf([{ day: '2026-09-25', minutes: null }], NOW);
    expect(cell(grid, 51, 4)).toBe('l2');
    expect(cell(grid, 51, 5)).toBe('');
  });

  it('grades by duration when the exit is known', () => {
    const grid = heatmapOf(
      [
        { day: '2026-09-21', minutes: 30 },
        { day: '2026-09-14', minutes: 120 },
        { day: '2026-09-15', minutes: 60 },
      ],
      NOW,
    );
    expect(cell(grid, 51, 0)).toBe('l1');
    expect(cell(grid, 50, 0)).toBe('l3');
    expect(cell(grid, 50, 1)).toBe('l2');
  });

  it('starts on the Monday 51 weeks before this one and drops anything older', () => {
    const grid = heatmapOf(
      [
        { day: '2025-09-29', minutes: null },
        { day: '2025-09-28', minutes: null },
      ],
      NOW,
    );
    expect(cell(grid, 0, 0)).toBe('l2');
    expect(grid.flat().filter((level) => level !== '')).toHaveLength(1);
  });
});
