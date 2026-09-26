import { nextPeriodRange, periodContaining } from './payroll-periods';

// Spec 050: la nómina se paga por quincena (1–15 y 16–fin de mes) y la
// siguiente siempre se puede calcular de la última — nadie la teclea.
describe('payroll periods', () => {
  it('follows the first half of a month with the second', () => {
    expect(nextPeriodRange('2026-09-15')).toEqual({ startDate: '2026-09-16', endDate: '2026-09-30', totalDays: 15 });
    expect(nextPeriodRange('2026-08-15')).toEqual({ startDate: '2026-08-16', endDate: '2026-08-31', totalDays: 16 });
  });

  it('follows the second half with the first half of the next month', () => {
    expect(nextPeriodRange('2026-08-31')).toEqual({ startDate: '2026-09-01', endDate: '2026-09-15', totalDays: 15 });
  });

  it('ends February on the 28th, or the 29th in a leap year', () => {
    expect(nextPeriodRange('2027-02-15')).toEqual({ startDate: '2027-02-16', endDate: '2027-02-28', totalDays: 13 });
    expect(nextPeriodRange('2028-02-15')).toEqual({ startDate: '2028-02-16', endDate: '2028-02-29', totalDays: 14 });
  });

  it('rolls December over into January of the next year', () => {
    expect(nextPeriodRange('2026-12-31')).toEqual({ startDate: '2027-01-01', endDate: '2027-01-15', totalDays: 15 });
  });

  // Una quincena capturada a mano con otras fechas no descompone el
  // calendario: la siguiente vuelve a cerrar el 15 o a fin de mes.
  it('snaps back to the calendar after an irregular period', () => {
    expect(nextPeriodRange('2026-09-10')).toEqual({ startDate: '2026-09-11', endDate: '2026-09-15', totalDays: 5 });
    expect(nextPeriodRange('2026-09-20')).toEqual({ startDate: '2026-09-21', endDate: '2026-09-30', totalDays: 10 });
  });

  it('without any period, it is the one that contains today', () => {
    expect(periodContaining('2026-09-26')).toEqual({ startDate: '2026-09-16', endDate: '2026-09-30', totalDays: 15 });
    expect(periodContaining('2026-10-01')).toEqual({ startDate: '2026-10-01', endDate: '2026-10-15', totalDays: 15 });
    expect(periodContaining('2026-10-15')).toEqual({ startDate: '2026-10-01', endDate: '2026-10-15', totalDays: 15 });
  });
});
