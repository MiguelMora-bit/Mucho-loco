import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';

/** Lo que devuelve Meta al aceptar un mensaje. */
export interface WhatsAppSendResult {
  messageId: string;
}

/**
 * Cliente de la Cloud API de WhatsApp (Meta), como provider inyectable —
 * misma costura que `StripeService` y `CognitoVerifierService`: los tests
 * sobreescriben ESTA clase, no el módulo HTTP.
 *
 * WhatsApp gana sobre email para este mercado (ver CLAUDE.md raíz). Ojo con la
 * regla de Meta que manda el diseño de todo esto: fuera de la ventana de 24h
 * desde el último mensaje del usuario, SOLO se pueden enviar **plantillas
 * aprobadas** — no texto libre. Por eso cada aviso nombra una plantilla y
 * manda parámetros posicionales, en vez de una cadena armada aquí.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  get configured(): boolean {
    return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  }

  /**
   * Envía una plantilla. `params` son los `{{1}}`, `{{2}}`... del cuerpo
   * aprobado, en orden.
   */
  async sendTemplate(
    to: string,
    template: string,
    lang: string,
    params: string[],
  ): Promise<WhatsAppSendResult> {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      throw new Error(
        'WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID no configuradas — no se pueden enviar avisos',
      );
    }
    const version = process.env.WHATSAPP_API_VERSION ?? 'v21.0';

    const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizePhone(to),
        type: 'template',
        template: {
          name: template,
          language: { code: lang },
          components: params.length
            ? [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }]
            : undefined,
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`WhatsApp respondió ${res.status}: ${detail.slice(0, 300)}`);
    }

    const data = (await res.json()) as { messages?: { id: string }[] };
    const messageId = data.messages?.[0]?.id;
    if (!messageId) throw new Error('WhatsApp aceptó el envío pero no devolvió un id de mensaje');
    return { messageId };
  }

  /**
   * Verifica la firma del webhook (`X-Hub-Signature-256`) contra el cuerpo
   * crudo, con el app secret de Meta.
   *
   * Mismo razonamiento que el webhook de Stripe: el endpoint es público porque
   * lo llama Meta, así que la firma es lo único que lo protege.
   */
  verifySignature(rawBody: Buffer, header: string | undefined): boolean {
    const secret = process.env.WHATSAPP_APP_SECRET;
    if (!secret || !header?.startsWith('sha256=')) return false;

    const expected = createHmac('sha256', secret).update(rawBody).digest();
    const received = Buffer.from(header.slice('sha256='.length), 'hex');
    // Longitudes distintas hacen tronar timingSafeEqual, y comparar con === abre
    // la puerta a un ataque de tiempo.
    if (expected.length !== received.length) return false;
    return timingSafeEqual(expected, received);
  }

  /** El token del `hub.verify_token` que Meta manda al dar de alta el webhook. */
  get verifyToken(): string | undefined {
    return process.env.WHATSAPP_VERIFY_TOKEN;
  }
}

/**
 * Meta espera el número en E.164 sin `+` ni separadores. Los teléfonos del
 * seed vienen como "+52 55 1234 5678", y mandarlos así hace que la API
 * responda 400 sin decir bien por qué.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Un número mexicano de 10 dígitos sin lada de país: se le antepone 52.
  return digits.length === 10 ? `52${digits}` : digits;
}
