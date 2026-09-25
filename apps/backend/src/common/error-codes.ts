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
  | 'EMAIL_ALREADY_LINKED'
  | 'BRANCH_NOT_FOUND'
  | 'ALREADY_SUBSCRIBED'
  | 'MEMBERSHIP_STILL_ACTIVE'
  | 'NOTHING_TO_PAY'
  | 'NO_BILLING_ACCOUNT'
  | 'MEMBER_RENEWS_ONLINE'
  | 'PICKUP_REQUIRES_MEMBERSHIP'
  | 'ADDRESS_REQUIRED'
  | 'NOT_A_HOME_ORDER'
  | 'ORDER_NOT_PAID'
  | 'ORDER_ALREADY_SHIPPED'
  | 'ORDER_NOT_SHIPPED'
  | 'FISCAL_PROFILE_NOT_FOUND'
  | 'FISCAL_PROFILE_REQUIRED'
  | 'CHARGE_NOT_FOUND'
  | 'CHARGE_ALREADY_INVOICED'
  | 'INVOICING_WINDOW_CLOSED'
  | 'CHARGE_NOT_INVOICEABLE'
  | 'INVOICING_UNAVAILABLE'
  | 'FISCAL_DATA_REJECTED'
  | 'INVOICING_PROVIDER_ERROR'
  | 'CFDI_NOT_FOUND'
  | 'CFDI_ALREADY_CANCELED'
  | 'CANCELLATION_REJECTED'
  | 'TICKET_NOT_FOUND'
  | 'WORKOUT_NOT_FOUND';

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

export const branchDoesNotStockProduct = (
  branchId: number,
  productId: string,
): ApiErrorBody => ({
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

export const branchNotFound = (branchId: number): ApiErrorBody => ({
  code: 'BRANCH_NOT_FOUND',
  message: `Branch not found: ${branchId}`,
  branchId,
});

/** Contratar otra vez encima de una suscripción viva cobraría dos veces. */
export const alreadySubscribed = (): ApiErrorBody => ({
  code: 'ALREADY_SUBSCRIBED',
  message: 'Ya tienes una membresía que se renueva sola',
});

/** Una visita encima de una membresía vigente no le suma nada al socio. */
export const membershipStillActive = (): ApiErrorBody => ({
  code: 'MEMBERSHIP_STILL_ACTIVE',
  message: 'Tu membresía sigue vigente; una visita no le agrega nada',
});

export const nothingToPay = (): ApiErrorBody => ({
  code: 'NOTHING_TO_PAY',
  message: 'No hay ningún cobro pendiente de tu membresía',
});

/**
 * Mostrador intentó renovar a un socio cuya membresía se cobra sola en línea:
 * sería cobrarle dos veces (spec 006). Que cancele la renovación en la app.
 */
export const memberRenewsOnline = (qrCode: string): ApiErrorBody => ({
  code: 'MEMBER_RENEWS_ONLINE',
  message: 'Este socio paga su membresía en la app y se cobra sola; no se puede renovar en mostrador',
  qrCode,
});

/** Sin suscripción viva no hay nada que administrar en el portal de Stripe. */
export const noBillingAccount = (): ApiErrorBody => ({
  code: 'NO_BILLING_ACCOUNT',
  message: 'No tienes una suscripción que administrar',
});

/** "Recoger en gym" hoy sale de la sucursal de la membresía; sin membresía no hay dónde. */
export const pickupRequiresMembership = (): ApiErrorBody => ({
  code: 'PICKUP_REQUIRES_MEMBERSHIP',
  message: 'Sin membresía no hay sucursal donde recoger',
});

export const addressRequired = (): ApiErrorBody => ({
  code: 'ADDRESS_REQUIRED',
  message: 'Un pedido a domicilio necesita dirección de envío',
});

export const notAHomeOrder = (orderId: string): ApiErrorBody => ({
  code: 'NOT_A_HOME_ORDER',
  message: `Order ${orderId} no es a domicilio`,
  orderId,
});

/** Mandar un pedido sin cobrar sería regalarlo. */
export const orderNotPaid = (orderId: string): ApiErrorBody => ({
  code: 'ORDER_NOT_PAID',
  message: `Order ${orderId} todavía no está cobrado`,
  orderId,
});

export const orderAlreadyShipped = (orderId: string): ApiErrorBody => ({
  code: 'ORDER_ALREADY_SHIPPED',
  message: `Order ${orderId} ya se envió`,
  orderId,
});

export const orderNotShipped = (orderId: string): ApiErrorBody => ({
  code: 'ORDER_NOT_SHIPPED',
  message: `Order ${orderId} todavía no se envía`,
  orderId,
});

// ─── Facturación CFDI ────────────────────────────────────────────────────────

export const fiscalProfileNotFound = (): ApiErrorBody => ({
  code: 'FISCAL_PROFILE_NOT_FOUND',
  message: 'Todavía no hay datos fiscales guardados',
});

export const fiscalProfileRequired = (): ApiErrorBody => ({
  code: 'FISCAL_PROFILE_REQUIRED',
  message: 'Para facturar, primero guarda tus datos fiscales',
});

export const chargeNotFound = (chargeId: string): ApiErrorBody => ({
  code: 'CHARGE_NOT_FOUND',
  message: `Charge not found: ${chargeId}`,
  chargeId,
});

export const chargeAlreadyInvoiced = (
  chargeId: string,
  cfdiId: string | null,
): ApiErrorBody => ({
  code: 'CHARGE_ALREADY_INVOICED',
  message: 'Este cobro ya tiene su factura',
  chargeId,
  cfdiId,
});

/** Lo que nadie facturó entra a la factura global del periodo, y de ahí ya no sale. */
export const invoicingWindowClosed = (chargeId: string): ApiErrorBody => ({
  code: 'INVOICING_WINDOW_CLOSED',
  message:
    'Este cobro ya entró a la factura global del periodo; ya no se puede facturar aparte',
  chargeId,
});

export const chargeNotInvoiceable = (chargeId: string): ApiErrorBody => ({
  code: 'CHARGE_NOT_INVOICEABLE',
  message: 'Este cobro no se puede facturar',
  chargeId,
});

export const invoicingUnavailable = (): ApiErrorBody => ({
  code: 'INVOICING_UNAVAILABLE',
  message:
    'La facturación no está disponible en este momento; intenta más tarde',
});

/**
 * El SAT, vía el PAC, rechazó los datos: un RFC que no existe, un nombre o
 * régimen que no coinciden con la constancia, un uso de CFDI que ese régimen
 * no admite. El mensaje del PAC viaja tal cual: es lo que el socio tiene que
 * corregir, y ningún código genérico se lo diría mejor.
 */
export const fiscalDataRejected = (detail: string): ApiErrorBody => ({
  code: 'FISCAL_DATA_REJECTED',
  message: detail,
  detail,
});

export const invoicingProviderError = (): ApiErrorBody => ({
  code: 'INVOICING_PROVIDER_ERROR',
  message: 'El proveedor de facturación no respondió; intenta más tarde',
});

export const cfdiNotFound = (cfdiId: string): ApiErrorBody => ({
  code: 'CFDI_NOT_FOUND',
  message: `CFDI not found: ${cfdiId}`,
  cfdiId,
});

export const cfdiAlreadyCanceled = (cfdiId: string): ApiErrorBody => ({
  code: 'CFDI_ALREADY_CANCELED',
  message: 'Esta factura ya está cancelada',
  cfdiId,
});

export const cancellationRejected = (
  cfdiId: string,
  detail: string,
): ApiErrorBody => ({
  code: 'CANCELLATION_REJECTED',
  message: detail,
  cfdiId,
  detail,
});

/** Un ticket de otra sucursal responde igual que uno que no existe. */
export const ticketNotFound = (kind: string, sourceId: string): ApiErrorBody => ({
  code: 'TICKET_NOT_FOUND',
  message: `Ticket not found: ${kind}/${sourceId}`,
  kind,
  sourceId,
});

/** Spec 017: no existe o es de otro socio — mismo 404, no se distingue. */
export const workoutNotFound = (workoutId: string): ApiErrorBody => ({
  code: 'WORKOUT_NOT_FOUND',
  message: `Workout not found: ${workoutId}`,
  workoutId,
});
