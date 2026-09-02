// Part of the counterSale repository contract — a real API datasource should
// reject with these same error types (mapped from its own error codes) so
// the UI layer never has to read a raw error message to know what happened.

export class ProductNotFoundError extends Error {
  productId: string;
  constructor(productId: string) {
    super(`Product not found in this branch: ${productId}`);
    this.productId = productId;
  }
}

export class InsufficientStockError extends Error {
  productName: string;
  constructor(productName: string) {
    super(`Insufficient stock: ${productName}`);
    this.productName = productName;
  }
}
