/**
 * Teléfono a E.164 (`+525512345678`), el único formato que acepta Cognito en
 * `phone_number`. Mismo criterio que `normalizePhone` del backend: 10 dígitos
 * es un número mexicano. `null` si no se puede interpretar.
 *
 * Importa porque sin teléfono no hay avisos de WhatsApp (vencimiento,
 * pedido listo) — ver "Notificaciones por WhatsApp" en apps/backend/CLAUDE.md.
 */
export function toE164(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (input.trim().startsWith('+')) {
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (digits.length === 10) return `+52${digits}`;
  if (digits.length === 12 && digits.startsWith('52')) return `+${digits}`;
  return null;
}
