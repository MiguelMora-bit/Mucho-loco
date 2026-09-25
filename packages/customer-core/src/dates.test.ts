import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, formatDayOfMonth, formatDuration, formatMonthShort } from './dates';

describe('formatDate', () => {
  // Una fecha sin hora se parsea como medianoche UTC; formatearla en México
  // (UTC-6) sin fijar la zona imprimiría el día anterior.
  it('does not slide to the previous day in a negative-offset timezone', () => {
    expect(formatDate('2026-06-18', 'es')).toContain('18');
    expect(formatDate('2026-06-18', 'en')).toContain('18');
  });

  it('follows the locale', () => {
    expect(formatDate('2026-06-18', 'es')).not.toBe(formatDate('2026-06-18', 'en'));
  });
});

describe('formatDuration', () => {
  it('drops the hours when there are none', () => {
    expect(formatDuration(58, 'es')).toBe('58m');
  });

  // El padStart mantiene alineada la columna de la lista de visitas.
  it('pads the minutes so the column stays aligned', () => {
    expect(formatDuration(122, 'es')).toBe('2h 02m');
    expect(formatDuration(84, 'es')).toBe('1h 24m');
  });

  it('handles an exact hour', () => {
    expect(formatDuration(60, 'es')).toBe('1h 00m');
  });

  // Spec 012: la entrada se registra en sucursal, la salida no — no hay duración.
  it('shows a dash when the exit was never recorded', () => {
    expect(formatDuration(null, 'es')).toBe('—');
  });
});

describe('formatDayOfMonth / formatMonthShort', () => {
  it('reads the day in UTC, not in the local timezone', () => {
    expect(formatDayOfMonth('2026-06-18T07:30:00.000Z', 'es')).toBe('18');
  });

  // Un instante de madrugada UTC es el día anterior en México: sin fijar UTC
  // la lista de visitas mostraría fechas corridas.
  it('does not slide an early-morning visit to the previous day', () => {
    expect(formatDayOfMonth('2026-06-18T01:00:00.000Z', 'es')).toBe('18');
  });

  it('gives an uppercase month with no trailing dot', () => {
    const month = formatMonthShort('2026-06-18T07:30:00.000Z', 'es');
    expect(month).toBe(month.toUpperCase());
    expect(month).not.toContain('.');
  });

  it('translates the month', () => {
    expect(formatMonthShort('2026-01-15T12:00:00.000Z', 'en')).toBe('JAN');
    expect(formatMonthShort('2026-01-15T12:00:00.000Z', 'es')).toBe('ENE');
  });
});

describe('formatDateTime', () => {
  // Un instante (cuándo se pagó), no una fecha sola: se ve en la hora de
  // quien lo lee. 03:30 UTC del 1 de septiembre es el 31 de agosto en CDMX.
  it('shows the local time, not UTC', () => {
    const text = formatDateTime('2026-09-01T03:30:00.000Z', 'es', 'America/Mexico_City');
    expect(text).toMatch(/31/);
    expect(text).toMatch(/ago/i);
    expect(text).toMatch(/9:30|21:30/);
  });

  it('includes the year — a charge list spans more than one', () => {
    expect(formatDateTime('2025-12-31T18:00:00.000Z', 'en', 'America/Mexico_City')).toContain('2025');
  });

  it('follows the locale', () => {
    const iso = '2026-09-15T18:00:00.000Z';
    expect(formatDateTime(iso, 'es', 'UTC')).not.toBe(formatDateTime(iso, 'en', 'UTC'));
  });
});
