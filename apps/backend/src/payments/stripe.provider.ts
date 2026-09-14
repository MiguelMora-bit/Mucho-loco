import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

/**
 * Cliente de Stripe como provider inyectable — misma costura que
 * `CognitoVerifierService`: los tests sobreescriben ESTA clase en vez de
 * mockear el módulo `stripe` con `jest.mock()`, así el código de producción no
 * sabe que está siendo testeado.
 *
 * La llave se lee del entorno y nunca se escribe en el repo. Si falta, el
 * módulo carga igual y falla al usarse — el resto del backend (que es casi
 * todo) tiene que poder correr sin credenciales de pasarela.
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private client: Stripe | null = null;

  get configured(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  }

  /** Instancia del cliente, no la API global — el patrón global está deprecado en el SDK. */
  get stripe(): Stripe {
    if (!this.client) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new Error(
          'STRIPE_SECRET_KEY no está configurada — no se pueden cobrar pagos en línea',
        );
      }
      this.client = new Stripe(key);
      this.logger.log('Cliente de Stripe inicializado');
    }
    return this.client;
  }

  /**
   * Verifica la firma del webhook contra el cuerpo CRUDO.
   *
   * Sin esto, cualquiera que conozca la URL podría mandar un
   * `checkout.session.completed` inventado y marcar pedidos como pagados. Es
   * la única defensa del endpoint: es público por necesidad (lo llama Stripe,
   * no un usuario con token).
   */
  constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error('STRIPE_WEBHOOK_SECRET no está configurada — no se puede verificar el webhook');
    }
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }
}
