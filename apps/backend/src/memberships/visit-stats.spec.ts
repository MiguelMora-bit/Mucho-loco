import { currentStreak, mexicoDay, visitsThisMonth } from './visit-stats';

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
