import { Injectable, Logger } from '@nestjs/common';
import Facturapi from 'facturapi';

/**
 * Un evento del webhook de Facturapi — solo lo que se usa. El objeto que trae
 * NO se aplica: se vuelve a leer de Facturapi (ver FiscalReceiptsService).
 */
export interface FacturapiEvent {
  type: string;
  data: { object: { id: string } };
}

/**
 * Cliente de Facturapi — el PAC que timbra los CFDI — como provider
 * inyectable. Misma costura que StripeService y WhatsAppService: los tests
 * sobreescriben ESTA clase, no el SDK.
 *
 * Un solo RFC factura para las 15 sucursales (CLAUDE.md raíz), así que hay UNA
 * organización en Facturapi y UNA llave. Con una llave de pruebas
 * (`sk_test_…`) todo el flujo funciona igual, pero nada se timbra ante el SAT.
 *
 * Si falta la llave, el módulo carga igual y la facturación responde
 * INVOICING_UNAVAILABLE: el resto del backend tiene que correr sin PAC.
 */
@Injectable()
export class FacturapiService {
  private readonly logger = new Logger(FacturapiService.name);
  private instance: Facturapi | null = null;

  get configured(): boolean {
    return Boolean(process.env.FACTURAPI_KEY);
  }

  get client(): Facturapi {
    if (!this.instance) {
      const key = process.env.FACTURAPI_KEY;
      if (!key) {
        throw new Error(
          'FACTURAPI_KEY no está configurada — no se pueden emitir facturas',
        );
      }
      this.instance = new Facturapi(key, { apiVersion: 'v2' });
      this.logger.log(
        `Cliente de Facturapi inicializado (${key.startsWith('sk_live') ? 'producción' : 'pruebas'})`,
      );
    }
    return this.instance;
  }

  /**
   * Verifica la firma del webhook contra el cuerpo CRUDO y devuelve el evento.
   * Tira si no cuadra.
   *
   * Mismo razonamiento que Stripe: el endpoint es público porque lo llama
   * Facturapi, y la firma es lo único que impide que cualquiera invente un
   * "este recibo ya se facturó".
   */
  async verifyWebhook(
    rawBody: Buffer,
    signature: string,
  ): Promise<FacturapiEvent> {
    const secret = process.env.FACTURAPI_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error(
        'FACTURAPI_WEBHOOK_SECRET no está configurada — no se puede verificar el webhook',
      );
    }
    const event = await this.client.webhooks.validateSignature({
      secret,
      signature,
      payload: rawBody,
    });
    return event;
  }
}
