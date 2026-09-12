import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Lang, LocalizedString } from '@mucho-loco/types';
import type Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.provider';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

/** Mismo cargo que aplica UsersService.createOrder — el envío no deja de cobrarse por pagar con tarjeta. */
const HOME_SHIPPING_FEE = 99;

/**
 * Stripe cobra en la unidad mínima de la moneda. El catálogo guarda pesos
 * enteros, así que un producto de $1290 son 129000 centavos. Sin esta
 * conversión se cobraría $12.90.
 */
const toCents = (pesos: number): number => pesos * 100;

/**
 * Etiqueta para comparar flujos de checkout en el dashboard de Stripe. El
 * sufijo aleatorio lo pide la propia guía de Stripe para que dos integraciones
 * distintas no compartan etiqueta.
 */
const INTEGRATION_IDENTIFIER = 'mucho-loco-store-kqvxnzrb';

export interface CheckoutSessionResult {
  orderId: string;
  /** A dónde redirigir al socio para que pague. */
  url: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private stripe: StripeService,
  ) {}

  /**
   * Crea el pedido en estado `pending_payment` y una sesión de Checkout.
   *
   * El pedido se guarda ANTES de mandar al socio a pagar, no después: si se
   * creara al volver de Stripe, un socio que paga y cierra la pestaña habría
   * pagado sin pedido. Queda pendiente de pago hasta que el webhook confirme
   * — igual que un pedido en efectivo hasta que lo recogen.
   *
   * Los precios salen del catálogo, nunca del cliente (misma regla que el
   * resto del backend): lo que se le cobra a la tarjeta lo arma el servidor.
   */
  async createCheckoutSession(
    userId: string,
    dto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionResult> {
    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.items.map((i) => i.productId) } },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    const lines = dto.items.map((line) => {
      const product = productById.get(line.productId);
      if (!product) throw new NotFoundException(`Product not found: ${line.productId}`);
      const name = (product.name as unknown as LocalizedString)[dto.lang];
      const flav = (product.flav as unknown as LocalizedString)[dto.lang];
      return { product, name, flav, qty: line.qty };
    });

    const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);
    const shipping = dto.delivery === 'home' ? HOME_SHIPPING_FEE : 0;
    const total = subtotal + shipping;

    let branchId: number | null = null;
    if (dto.delivery === 'pickup') {
      const membership = await this.prisma.membership.findUnique({ where: { userId } });
      if (!membership) {
        throw new BadRequestException('Sin membresía no hay sucursal donde recoger');
      }
      branchId = membership.branchId;
    }

    const order = await this.prisma.order.create({
      data: {
        userId,
        status: 'pending_payment',
        total,
        paymentMethod: 'stripe',
        delivery: dto.delivery,
        branchId,
        items: {
          create: lines.map((l) => ({
            name: l.name,
            flav: l.flav,
            img: l.product.img,
            qty: l.qty,
          })),
        },
      },
    });

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = lines.map((l) => ({
      quantity: l.qty,
      price_data: {
        currency: 'mxn',
        unit_amount: toCents(l.product.price),
        product_data: {
          name: l.flav ? `${l.name} · ${l.flav}` : l.name,
          images: l.product.img.startsWith('http') ? [l.product.img] : undefined,
        },
      },
    }));

    if (shipping > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: 'mxn',
          unit_amount: toCents(shipping),
          product_data: { name: dto.lang === 'es' ? 'Envío a domicilio' : 'Home delivery' },
        },
      });
    }

    // Sin `payment_method_types`: dejarlo fuera activa los métodos de pago
    // dinámicos, que es como Stripe decide qué ofrecerle a cada socio según
    // país, monto y dispositivo. Fijarlo a ['card'] apagaría eso.
    const session = await this.stripe.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      locale: dto.lang,
      success_url: `${dto.successUrl}${dto.successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: dto.cancelUrl,
      // El id del pedido viaja en la sesión para poder reconciliar cuando
      // llegue el webhook, sin depender de que el socio vuelva al sitio.
      client_reference_id: order.id,
      metadata: { orderId: order.id },
      integration_identifier: INTEGRATION_IDENTIFIER,
    });

    if (!session.url) {
      throw new BadRequestException('Stripe no devolvió una URL de checkout');
    }

    await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'stripe',
        status: 'pending',
        amount: total,
        currency: 'mxn',
        providerSessionId: session.id,
      },
    });

    return { orderId: order.id, url: session.url };
  }

  /**
   * Procesa un evento ya verificado.
   *
   * La entrega del pedido NO se dispara en la página de éxito: un socio puede
   * pagar y perder la conexión antes de que cargue, y el pedido se quedaría
   * sin surtir para siempre. El webhook es la única fuente de verdad.
   *
   * `checkout.session.completed` puede llegar con la sesión TODAVÍA sin pagar
   * (métodos de pago de notificación diferida: OXXO, transferencias). Por eso
   * se exige `payment_status !== 'unpaid'` y se escucha también
   * `async_payment_succeeded` — sin eso se surtirían pagos que después fallan
   * y no se surtirían los que sí terminan bien.
   */
  async handleEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        if (session.payment_status === 'unpaid') {
          this.logger.log(`Sesión ${session.id} completada pero todavía sin pagar — se espera el evento asíncrono`);
          return;
        }
        await this.markPaid(session);
        return;
      }
      case 'checkout.session.async_payment_failed': {
        await this.markFailed(event.data.object.id);
        return;
      }
      case 'checkout.session.expired': {
        await this.markFailed(event.data.object.id);
        return;
      }
      default:
        // Stripe reintenta si respondemos error, así que un evento que no nos
        // interesa se ignora en silencio y se responde 200.
        this.logger.debug(`Evento ignorado: ${event.type}`);
    }
  }

  /**
   * Idempotente a propósito: Stripe reintenta la entrega y el MISMO evento
   * puede llegar varias veces. Si el pago ya estaba en 'paid', no se vuelve a
   * tocar el pedido.
   */
  private async markPaid(session: Stripe.Checkout.Session): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { providerSessionId: session.id },
      include: { order: true },
    });
    if (!payment) {
      this.logger.warn(`Webhook de una sesión desconocida: ${session.id}`);
      return;
    }
    if (payment.status === 'paid') return;

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent?.id ?? null);

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'paid', providerPaymentIntentId: paymentIntentId },
      }),
      // 'ready' = pagado y listo para surtir; es el mismo estado al que llega
      // un pedido con cualquier otro método ya cobrado.
      this.prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'ready' },
      }),
    ]);
    this.logger.log(`Pedido ${payment.orderId} pagado (sesión ${session.id})`);
  }

  private async markFailed(sessionId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { providerSessionId: sessionId },
    });
    if (!payment || payment.status === 'paid') return;

    // El pedido se queda en 'pending_payment': el socio puede volver a
    // intentar, y borrarlo perdería lo que ya había armado.
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'failed' },
    });
    this.logger.log(`Pago fallido o expirado para el pedido ${payment.orderId}`);
  }
}
