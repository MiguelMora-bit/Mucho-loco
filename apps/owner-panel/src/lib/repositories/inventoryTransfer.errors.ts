// Part of the inventoryTransfer repository contract — a real API datasource
// should reject with these same error types (mapped from its own error
// codes) so the UI layer never has to read a raw error message to know what
// happened. Same pattern as branch-app's counterSale.errors.ts.

export class InsufficientStockError extends Error {
  productName: string;
  constructor(productName: string) {
    super(`Insufficient stock: ${productName}`);
    this.productName = productName;
  }
}

export class SameBranchError extends Error {
  constructor() {
    super('Source and destination branch must be different');
  }
}
