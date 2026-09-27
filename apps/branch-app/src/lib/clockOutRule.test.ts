import { describe, it, expect } from 'vitest';
import { clockOutProblem } from './clockOutRule';

// Mismos casos que el backend (apps/backend/src/attendance/clock-out-rule.spec.ts).
describe('clockOutProblem (spec 055)', () => {
  const clockIn = new Date('2026-09-25T13:00:00.000Z');
  const now = new Date('2026-09-26T15:00:00.000Z');

  it('accepts a time after the clock-in, in the past, within one shift', () => {
    expect(clockOutProblem(clockIn, new Date('2026-09-25T21:00:00.000Z'), now)).toBeNull();
  });

  it('refuses before the clock-in, the future, and more than 24 hours', () => {
    expect(clockOutProblem(clockIn, clockIn, now)).toBe('before_clock_in');
    expect(clockOutProblem(new Date('2026-09-26T13:00:00.000Z'), new Date('2026-09-26T16:00:00.000Z'), now)).toBe('in_future');
    expect(clockOutProblem(clockIn, new Date('2026-09-26T13:00:00.001Z'), now)).toBe('too_long');
  });
});
