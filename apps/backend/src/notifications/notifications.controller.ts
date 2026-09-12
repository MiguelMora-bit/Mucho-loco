import { Controller, ForbiddenException, Get, HttpCode, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { WhatsAppService } from './whatsapp.provider';
import { Public } from '../auth/public.decorator';

/**
 * Webhook de la Cloud API de WhatsApp.
 *
 * Dos verbos, dos propósitos distintos:
 *   GET  — el handshake de alta. Meta llama una vez con `hub.challenge` y hay
 *          que devolverlo tal cual, en texto plano, si el `hub.verify_token`
 *          coincide con el que se configuró en Meta Business.
 *   POST — los eventos (estados de entrega, mensajes entrantes). Público
 *          porque lo llama Meta, protegido por la firma HMAC del cuerpo crudo.
 */
@Controller('notifications/whatsapp')
export class NotificationsController {
  constructor(private whatsapp: WhatsAppService) {}

  @Public()
  @Get('webhook')
  verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ): string {
    const expected = this.whatsapp.verifyToken;
    if (mode !== 'subscribe' || !expected || token !== expected) {
      throw new ForbiddenException('hub.verify_token inválido');
    }
    // Meta espera el challenge crudo, sin envolver en JSON.
    return challenge ?? '';
  }

  @Public()
  @Post('webhook')
  @HttpCode(200)
  receive(@Req() req: Request & { rawBody?: Buffer }): { received: true } {
    const signature = req.header('x-hub-signature-256');
    if (!req.rawBody || !this.whatsapp.verifySignature(req.rawBody, signature)) {
      // 200 aunque la firma no cuadre: Meta desactiva un webhook que responde
      // errores de forma sostenida, y un atacante no debe poder tirarnos el
      // canal mandando basura firmada mal. El evento simplemente se descarta.
      return { received: true };
    }

    // Todavía no se hace nada con los estados de entrega ni con los mensajes
    // entrantes: el canal es de salida por ahora. El endpoint existe porque
    // Meta lo exige para dar de alta la app, y verificar la firma desde el
    // principio evita tener que recordarlo cuando sí se procese algo.
    return { received: true };
  }
}
