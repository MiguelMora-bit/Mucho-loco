// Part of the payroll repository contract — a real API datasource should
// reject with these same error types (mapped from its own error codes) so
// the UI layer never has to read a raw error message to know what happened.

export class PeriodNotFoundError extends Error {
  periodId: string;
  constructor(periodId: string) {
    super(`Payroll period not found: ${periodId}`);
    this.periodId = periodId;
  }
}

export class PeriodAlreadyClosedError extends Error {
  periodId: string;
  constructor(periodId: string) {
    super(`Payroll period already closed: ${periodId}`);
    this.periodId = periodId;
  }
}
