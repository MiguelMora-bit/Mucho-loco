// Part of the cash register shift repository contract — a real API
// datasource should reject with these same error types (mapped from its own
// error codes) so the UI layer never has to read a raw error message to know
// what happened.

export class ShiftNotFoundError extends Error {
  shiftId: string;
  constructor(shiftId: string) {
    super(`Cash register shift not found: ${shiftId}`);
    this.shiftId = shiftId;
  }
}

export class ShiftAlreadyClosedError extends Error {
  shiftId: string;
  constructor(shiftId: string) {
    super(`Cash register shift already closed: ${shiftId}`);
    this.shiftId = shiftId;
  }
}
