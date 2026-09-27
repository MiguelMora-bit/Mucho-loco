import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { NotificationKind } from '@prisma/client';
import type { NotificationPreferences } from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.provider';
import { allows, preferencesOf } from './preferences';

/**
 * Cuántos días antes del vencimiento se avisa. Tres avisos y no uno solo: la
 * regla de negocio (CLAUDE.md raíz) pide "avisos" en plural antes de
 * suspender el acceso, y uno solo a 7 días se pierde fácil.
 */
const EXPIRY_WARNING_DAYS = [7, 3, 1];

/** Plantillas aprobadas en Meta Business. Los nombres tienen que existir allá. */
const TEMPLATES: Record<NotificationKind, string> = {
  membership_expiring: 'membresia_por_vencer',
  membership_grace: 'membresia_pago_fallido',
  order_ready: 'pedido_listo',
  payment_confirmed: 'pago_confirmado',
  order_shipped: 'pedido_en_camino',
};

/** Tercer parámetro de `pedido_en_camino` cuando bodega no capturó guía: Meta exige todos. */
const NO_TRACKING = 'sin guía por ahora';

const isoDay = (d: Date): string => d.toISOString().slice(0, 10);

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsAppService,
  ) {}

  /**
   * Manda un aviso una sola vez.
   *
   * `dedupeKey` es lo que hace que esto sea llamable desde un cron sin
   * spamear: el índice único `(userId, kind, dedupeKey)` rechaza el segundo
   * intento. Se consulta ANTES de llamar a Meta para no gastar un envío, y el
   * índice queda como red por si dos instancias corren el cron a la vez.
   *
   * Nunca tira: que un aviso falle no puede tumbar el cobro ni la entrega que
   * lo disparó. El fallo queda registrado con `status: 'failed'`.
   *
   * Si el socio apagó esa categoría en Configuración (spec 053), no se manda y
   * tampoco se registra: si la vuelve a prender dentro del mismo ciclo, el
   * siguiente intento sí sale.
   */
  async notifyOnce(input: {
    userId: string;
    kind: NotificationKind;
    dedupeKey: string;
    phone: string;
    lang: string;
    params: string[];
    preferences: NotificationPreferences;
  }): Promise<boolean> {
    const { userId, kind, dedupeKey, phone, lang, params, preferences } = input;

    if (!allows(preferences, kind)) {
      this.logger.log(`Socio ${userId} apagó los avisos de ${kind} — se omite`);
      return false;
    }

    const already = await this.prisma.notification.findUnique({
      where: { userId_kind_dedupeKey: { userId, kind, dedupeKey } },
    });
    if (already) return false;

    if (!phone) {
      this.logger.warn(`Socio ${userId} sin teléfono — no se puede avisar por WhatsApp`);
      return false;
    }
    if (!this.whatsapp.configured) {
      this.logger.warn(`WhatsApp no configurado — se omite el aviso ${kind} de ${userId}`);
      return false;
    }

    const template = TEMPLATES[kind];
    try {
      const { messageId } = await this.whatsapp.sendTemplate(phone, template, lang, params);
      await this.prisma.notification.create({
        data: { userId, kind, dedupeKey, phone, template, status: 'sent', providerMessageId: messageId },
      });
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Falló el aviso ${kind} de ${userId}: ${message}`);
      // Se guarda igual: sin esto, el próximo tick del cron reintentaría en
      // bucle contra un número que quizá nunca va a funcionar.
      await this.prisma.notification.create({
        data: { userId, kind, dedupeKey, phone, template, status: 'failed', error: message.slice(0, 500) },
      });
      return false;
    }
  }

  /** Confirmación de pago — la dispara el webhook de Stripe al surtir el pedido. */
  async notifyPaymentConfirmed(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order) return;

    await this.notifyOnce({
      userId: order.userId,
      kind: 'payment_confirmed',
      dedupeKey: order.id,
      phone: order.user.phone,
      preferences: preferencesOf(order.user),
      lang: 'es',
      params: [order.user.name, `$${order.total.toLocaleString('es-MX')}`],
    });

    // Un pedido a domicilio no se recoge en ningún lado, así que ese aviso
    // solo aplica a "recoger en gym".
    if (order.delivery === 'pickup') {
      await this.notifyOnce({
        userId: order.userId,
        kind: 'order_ready',
        dedupeKey: order.id,
        phone: order.user.phone,
      preferences: preferencesOf(order.user),
        lang: 'es',
        params: [order.user.name, order.id.slice(0, 8).toUpperCase()],
      });
    }
  }

  /**
   * "Tu pedido va en camino" (spec 008) — lo dispara bodega al marcar el
   * envío. Una vez por pedido (`dedupeKey` = el pedido) y nunca tira.
   */
  async notifyOrderShipped(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order) return;

    await this.notifyOnce({
      userId: order.userId,
      kind: 'order_shipped',
      dedupeKey: order.id,
      phone: order.user.phone,
      preferences: preferencesOf(order.user),
      lang: 'es',
      params: [order.user.name, order.id.slice(0, 8).toUpperCase(), order.trackingNumber ?? NO_TRACKING],
    });
  }

  /**
   * Barrido diario de membresías.
   *
   * Un cron y no un evento porque "vencer" no es algo que alguien haga: nadie
   * hace clic en nada el día que a un socio le quedan 3 días. La hora es de la
   * mañana en CDMX (el contenedor corre con TZ=America/Mexico_City, ver el
   * Dockerfile) — mandar avisos de cobro a las 3am sería hostil.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sweepMemberships(): Promise<void> {
    const sent = await this.runMembershipSweep();
    if (sent > 0) this.logger.log(`Barrido de membresías: ${sent} avisos enviados`);
  }

  /** Separado del método con `@Cron` para poder llamarlo desde un test sin esperar a las 9am. */
  async runMembershipSweep(): Promise<number> {
    const memberships = await this.prisma.membership.findMany({
      where: { status: { in: ['active', 'grace'] } },
      include: { user: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let sent = 0;

    for (const membership of memberships) {
      const daysLeft = Math.ceil((membership.expiresAt.getTime() - today.getTime()) / 86_400_000);

      // El periodo de gracia es el aviso urgente: el cobro ya falló y el acceso
      // se suspende cuando se acabe (ver "Pago recurrente" en el CLAUDE.md raíz).
      if (membership.status === 'grace' && membership.graceEndsAt) {
        const ok = await this.notifyOnce({
          userId: membership.userId,
          kind: 'membership_grace',
          dedupeKey: isoDay(membership.graceEndsAt),
          phone: membership.user.phone,
          preferences: preferencesOf(membership.user),
          lang: 'es',
          params: [membership.user.name, isoDay(membership.graceEndsAt)],
        });
        if (ok) sent++;
        continue;
      }

      // Quien tiene suscripción no "vence": Stripe le cobra solo. Avisarle
      // "renueva o pierdes el acceso" sería falso y lo haría pagar dos veces.
      // Con suscripción viva Stripe cobra solo; con la renovación cancelada, sí hay que avisar.
      if ((!membership.stripeSubscriptionId || membership.renewalCanceled) && EXPIRY_WARNING_DAYS.includes(daysLeft)) {
        const ok = await this.notifyOnce({
          userId: membership.userId,
          kind: 'membership_expiring',
          // La fecha de vencimiento, no "quedan N días": así los tres avisos
          // (7, 3 y 1) comparten llave y el socio recibe UNO solo por
          // vencimiento, no tres. Si renueva, la fecha cambia y el ciclo
          // siguiente vuelve a avisar.
          dedupeKey: isoDay(membership.expiresAt),
          phone: membership.user.phone,
          preferences: preferencesOf(membership.user),
          lang: 'es',
          params: [membership.user.name, String(daysLeft)],
        });
        if (ok) sent++;
      }
    }

    return sent;
  }
}
