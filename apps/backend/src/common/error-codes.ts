/**
 * Códigos de error que el API promete en el cuerpo de un 4xx.
 *
 * Existen porque un frontend no debe tener que leer el mensaje en prosa para
 * saber qué pasó — lo dice explícitamente el contrato de `branch-app`
 * (`repositories/counterSale.errors.ts`: "so the UI layer never has to read a
 * raw error message to know what happened"). Un mensaje es para una persona;
 * un código es para el código.
 *
 * NestJS serializa el objeto que se le pasa a la excepción, así que
 * `throw new NotFoundException(productNotFound('p1'))` sale como
 * `{ code: 'PRODUCT_NOT_FOUND', productId: 'p1', message: '...' }`.
 */
export type ApiErrorCode =
  | 'PRODUCT_NOT_FOUND'
  | 'INSUFFICIENT_STOCK'
  | 'BRANCH_DOES_NOT_STOCK_PRODUCT'
  | 'SAME_BRANCH_TRANSFER'
  | 'SHIFT_NOT_FOUND'
  | 'SHIFT_ALREADY_CLOSED'
  | 'MEMBER_NOT_FOUND'
  | 'ALREADY_CLOCKED_IN'
  | 'NO_OPEN_ENTRY'
  | 'PERIOD_NOT_FOUND'
  | 'PERIOD_ALREADY_CLOSED'
  | 'ORDER_ALREADY_DELIVERED'
  | 'NOT_A_PICKUP_ORDER'
  | 'CASH_REQUIRES_PICKUP'
  | 'EMAIL_ALREADY_LINKED';

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  [detail: string]: unknown;
}

export const productNotFound = (productId: string): ApiErrorBody => ({
  code: 'PRODUCT_NOT_FOUND',
  message: `Product not found: ${productId}`,
  productId,
});

/** `productName` viaja en el cuerpo porque la UI lo muestra ("no hay suficiente Whey"). */
export const insufficientStock = (
  productId: string,
  productName: string,
  available: number,
  requested: number,
): ApiErrorBody => ({
  code: 'INSUFFICIENT_STOCK',
  message: `Stock insuficiente de ${productName}: hay ${available}, se piden ${requested}`,
  productId,
  productName,
  available,
  requested,
});

export const branchDoesNotStockProduct = (branchId: number, productId: string): ApiErrorBody => ({
  code: 'BRANCH_DOES_NOT_STOCK_PRODUCT',
  message: `La sucursal ${branchId} no maneja el producto ${productId}`,
  branchId,
  productId,
});

export const sameBranchTransfer = (): ApiErrorBody => ({
  code: 'SAME_BRANCH_TRANSFER',
  message: 'No se puede transferir a la misma sucursal',
});

export const shiftNotFound = (shiftId: string): ApiErrorBody => ({
  code: 'SHIFT_NOT_FOUND',
  message: `Shift not found: ${shiftId}`,
  shiftId,
});

export const shiftAlreadyClosed = (shiftId: string): ApiErrorBody => ({
  code: 'SHIFT_ALREADY_CLOSED',
  message: `Shift already closed: ${shiftId}`,
  shiftId,
});

export const memberNotFound = (qrCode: string): ApiErrorBody => ({
  code: 'MEMBER_NOT_FOUND',
  message: `Member QR code not found: ${qrCode}`,
  qrCode,
});

export const alreadyClockedIn = (staffEmail: string): ApiErrorBody => ({
  code: 'ALREADY_CLOCKED_IN',
  message: `${staffEmail} ya tiene un turno abierto`,
  staffEmail,
});

export const noOpenEntry = (staffEmail: string): ApiErrorBody => ({
  code: 'NO_OPEN_ENTRY',
  message: `${staffEmail} no tiene un turno abierto`,
  staffEmail,
});

export const periodNotFound = (periodId: string): ApiErrorBody => ({
  code: 'PERIOD_NOT_FOUND',
  message: `Payroll period not found: ${periodId}`,
  periodId,
});

export const periodAlreadyClosed = (periodId: string): ApiErrorBody => ({
  code: 'PERIOD_ALREADY_CLOSED',
  message: `Payroll period already closed: ${periodId}`,
  periodId,
});

export const orderAlreadyDelivered = (orderId: string): ApiErrorBody => ({
  code: 'ORDER_ALREADY_DELIVERED',
  message: `Pickup order already delivered: ${orderId}`,
  orderId,
});

export const notAPickupOrder = (orderId: string): ApiErrorBody => ({
  code: 'NOT_A_PICKUP_ORDER',
  message: `Order ${orderId} no es de recoger en gym`,
  orderId,
});

export const cashRequiresPickup = (): ApiErrorBody => ({
  code: 'CASH_REQUIRES_PICKUP',
  message: 'cash payment method requires pickup delivery',
});

export const emailAlreadyLinked = (email: string): ApiErrorBody => ({
  code: 'EMAIL_ALREADY_LINKED',
  message: `Ya existe un socio con el correo ${email} ligado a otra cuenta de acceso`,
  email,
});
