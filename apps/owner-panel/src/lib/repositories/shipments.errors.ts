// Parte del contrato de shipments: el mock y el datasource HTTP rechazan con
// este mismo tipo (el HTTP lo traduce del código del backend), así la página
// nunca tiene que leer un mensaje crudo para saber qué pasó. Mismo patrón que
// inventoryTransfer.errors.ts.

export type ShipmentStateReason = 'already_shipped' | 'not_shipped' | 'already_delivered' | 'not_paid';

/**
 * El envío ya no está donde la pantalla creía: alguien lo movió desde otra
 * pestaña, o la lista estaba vieja. La página vuelve a pedir la lista.
 */
export class ShipmentStateError extends Error {
  readonly orderId: string;
  readonly reason: ShipmentStateReason;

  constructor(orderId: string, reason: ShipmentStateReason) {
    super(`Shipment ${orderId}: ${reason}`);
    this.orderId = orderId;
    this.reason = reason;
  }
}
