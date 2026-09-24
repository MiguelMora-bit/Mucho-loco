/**
 * El WhatsApp del negocio — el canal de soporte (ver "Pendiente / conocido" en
 * CLAUDE.md: no hay formulario de contacto). wa.me necesita solo dígitos; la
 * etiqueta visible usa el formato legible. Una sola constante para que las dos
 * no se desincronicen si el número cambia.
 */
export const WHATSAPP = { number: '525512345678', display: '+52 55 1234 5678' };

/** Abre una conversación con soporte con el mensaje ya escrito. */
export function whatsappUrl(text: string): string {
  return `https://wa.me/${WHATSAPP.number}?text=${encodeURIComponent(text)}`;
}
