// Parte del contrato de membresías de mostrador: el mock y el datasource HTTP
// rechazan con el mismo tipo (el HTTP lo traduce del código del backend), así
// la pantalla nunca lee un mensaje crudo. Mismo patrón que counterSale.errors.ts.

/**
 * El socio paga su membresía en la app y Stripe se la cobra sola: renovarla
 * aquí sería cobrarle dos veces (spec 006). Que cancele la renovación en la app.
 */
export class MemberRenewsOnlineError extends Error {
  readonly qrCode: string;
  constructor(qrCode: string) {
    super(`Member renews online: ${qrCode}`);
    this.qrCode = qrCode;
  }
}
