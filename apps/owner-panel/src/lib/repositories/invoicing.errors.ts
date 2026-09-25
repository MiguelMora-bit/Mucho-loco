// Parte del contrato de facturación: el mock y el datasource HTTP rechazan con
// estos mismos tipos (el HTTP los traduce del código del backend), así la
// página nunca lee un mensaje crudo. Mismo patrón que shipments.errors.ts.

/** El SAT (vía el PAC) rechazó la cancelación; `detail` es su motivo, tal cual. */
export class CancellationRejectedError extends Error {
  readonly cfdiId: string;
  readonly detail: string;
  constructor(cfdiId: string, detail: string) {
    super(detail);
    this.cfdiId = cfdiId;
    this.detail = detail;
  }
}

/** Ya estaba cancelada: la lista estaba vieja. La página la vuelve a pedir. */
export class CfdiAlreadyCanceledError extends Error {
  readonly cfdiId: string;
  constructor(cfdiId: string) {
    super(`CFDI already canceled: ${cfdiId}`);
    this.cfdiId = cfdiId;
  }
}

/** Facturación apagada (sin llave) o el PAC no respondió: nada cambió. */
export class InvoicingUnavailableError extends Error {
  constructor() {
    super('Invoicing unavailable');
  }
}
