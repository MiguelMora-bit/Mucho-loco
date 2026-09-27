import { describe, it, expect } from 'vitest';
import { currentDay, currentMonth } from './currentMonth';

describe('CDMX calendar', () => {
  // 27 de septiembre, 02:00 UTC = 26 de septiembre, 20:00 en CDMX.
  const evening = new Date('2026-09-27T02:00:00.000Z');

  it('today is the CDMX day, not the UTC one (spec 054)', () => {
    expect(currentDay(evening)).toBe('2026-09-26');
  });

  it('the month turns with the CDMX clock', () => {
    expect(currentMonth(new Date('2026-10-01T03:00:00.000Z'))).toBe('2026-09');
  });
});
