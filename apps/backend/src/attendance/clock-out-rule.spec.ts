import { clockOutProblem, MAX_SHIFT_HOURS } from './clock-out-rule';

// Spec 055: la salida que captura el gerente para un turno olvidado.
describe('clockOutProblem', () => {
  const clockIn = new Date('2026-09-25T13:00:00.000Z'); // 07:00 en CDMX
  const now = new Date('2026-09-26T15:00:00.000Z');

  it('accepts a time after the clock-in, in the past, within one shift', () => {
    expect(clockOutProblem(clockIn, new Date('2026-09-25T21:00:00.000Z'), now)).toBeNull();
  });

  it('refuses a time at or before the clock-in', () => {
    expect(clockOutProblem(clockIn, clockIn, now)).toBe('before_clock_in');
    expect(clockOutProblem(clockIn, new Date('2026-09-25T12:00:00.000Z'), now)).toBe('before_clock_in');
  });

  it('refuses the future', () => {
    expect(clockOutProblem(new Date('2026-09-26T13:00:00.000Z'), new Date('2026-09-26T16:00:00.000Z'), now)).toBe('in_future');
  });

  it(`refuses a shift longer than ${MAX_SHIFT_HOURS} hours`, () => {
    expect(clockOutProblem(clockIn, new Date('2026-09-26T13:00:00.001Z'), now)).toBe('too_long');
    expect(clockOutProblem(clockIn, new Date('2026-09-26T13:00:00.000Z'), now)).toBeNull();
  });
});
