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
