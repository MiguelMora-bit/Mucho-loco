// Part of the attendance repository contract — a real API datasource should
// reject with these same error types (mapped from its own error codes) so
// the UI layer never has to read a raw error message to know what happened.

export class AlreadyClockedInError extends Error {
  staffEmail: string;
  constructor(staffEmail: string) {
    super(`Staff already clocked in: ${staffEmail}`);
    this.staffEmail = staffEmail;
  }
}

export class NoOpenEntryError extends Error {
  staffEmail: string;
  constructor(staffEmail: string) {
    super(`No open attendance entry for: ${staffEmail}`);
    this.staffEmail = staffEmail;
  }
}

/** Spec 055: el turno a corregir ya no existe. */
export class EntryNotFoundError extends Error {
  entryId: string;
  constructor(entryId: string) {
    super(`Attendance entry not found: ${entryId}`);
    this.entryId = entryId;
  }
}

/** Spec 055: el empleado ya fichó su salida (o alguien más la corrigió). */
export class EntryAlreadyClosedError extends Error {
  entryId: string;
  constructor(entryId: string) {
    super(`Attendance entry already closed: ${entryId}`);
    this.entryId = entryId;
  }
}

export type ClockOutProblem = 'before_clock_in' | 'in_future' | 'too_long';

/** Spec 055: la hora de salida no es válida (misma regla que el backend). */
export class InvalidClockOutError extends Error {
  entryId: string;
  reason: ClockOutProblem;
  constructor(entryId: string, reason: ClockOutProblem) {
    super(`Invalid clock-out for ${entryId}: ${reason}`);
    this.entryId = entryId;
    this.reason = reason;
  }
}
