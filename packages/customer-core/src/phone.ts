/**
 * Teléfono a E.164 (`+525512345678`), el formato que acepta Cognito en
 * `phone_number` y el que guarda el backend. Mismo criterio que
 * `normalizePhone` del backend: 10 dígitos es un número mexicano. `null` si
 * no se puede interpretar.
 *
 * Vive aquí (antes en mobile-app) porque lo usan los dos clientes: el registro
 * del móvil y el teléfono del repartidor en la dirección de envío.
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
