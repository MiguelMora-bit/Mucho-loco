// Part of the expenses repository contract (spec 054) — the HTTP datasource
// maps the backend code to it, so the page never reads a raw message.

export class ExpenseNotFoundError extends Error {
  expenseId: string;
  constructor(expenseId: string) {
    super(`Expense not found: ${expenseId}`);
    this.expenseId = expenseId;
  }
}
