import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService, type CheckoutSessionResult } from './payments.service';
import { MembershipBillingService } from './membership-billing.service';
import { StripeService } from './stripe.provider';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CreateMembershipCheckoutDto } from './dto/create-membership-checkout.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { IdTokenClaims } from '../auth/cognito';
import { UsersService } from '../users/users.service';
import { Public } from '../auth/public.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(
    private payments: PaymentsService,
    private membershipBilling: MembershipBillingService,
    private stripe: StripeService,
    private users: UsersService,
  ) {}

  /**
   * Contratar o renovar la membresía. Devuelve la URL de Stripe; la membresía
   * se activa cuando llega el webhook, nunca al volver el socio.
   */
  @Post('membership-checkout-sessions')
  async createMembershipCheckout(
    @CurrentUser() user: IdTokenClaims,
    @Body() dto: CreateMembershipCheckoutDto,
  ): Promise<{ url: string }> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    return this.membershipBilling.createCheckout(dbUser.id, dto);
  }

  /** Periodo de gracia: la factura que falló, para pagarla con otra tarjeta. */
  @Post('membership-invoice')
  async openMembershipInvoice(@CurrentUser() user: IdTokenClaims): Promise<{ url: string }> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    return this.membershipBilling.openPendingInvoice(dbUser.id);
  }

  /** El pedido se crea aquí, a nombre del socio del token — nunca de un email del body. */
  @Post('checkout-sessions')
  async createCheckoutSession(
    @CurrentUser() user: IdTokenClaims,
    @Body() dto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionResult> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    return this.payments.createCheckoutSession(dbUser.id, dto);
  }

  /**
   * Lo llama Stripe, no un usuario: es `@Public()` por necesidad, y lo que lo
   * protege es la FIRMA del evento, no un token. Sin verificarla, cualquiera
   * que conozca la URL podría marcar pedidos como pagados.
   *
   * Necesita el cuerpo CRUDO (`rawBody: true` en main.ts): la firma se calcula
   * sobre los bytes exactos que mandó Stripe, y volver a serializar el JSON
   * parseado cambia espacios y orden de llaves, así que la verificación
   * fallaría siempre.
   */
  @Public()
  @Post('stripe/webhook')
  @HttpCode(200)
  async stripeWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature?: string,
  ): Promise<{ received: true }> {
    if (!signature) throw new BadRequestException('Falta la cabecera stripe-signature');
    if (!req.rawBody) throw new BadRequestException('Falta el cuerpo crudo de la petición');

    let event;
    try {
      event = this.stripe.constructEvent(req.rawBody, signature);
    } catch (e) {
      // 400, no 500: la firma inválida es culpa de quien llamó. Stripe
      // reintenta ante un 5xx, y no queremos reintentos de un evento falso.
      throw new BadRequestException(
        `Firma de webhook inválida: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    await this.payments.handleEvent(event);
    // Responder 200 rápido: si Stripe no recibe respuesta, reintenta el evento.
    return { received: true };
  }
}
