import type { AccessStatus } from '@mucho-loco/types';

/**
 * Días que un socio conserva el acceso después de que falla el cobro de su
 * renovación ("periodo de gracia con avisos antes de suspender", CLAUDE.md
 * raíz). Stripe sigue reintentando el cobro por su cuenta durante ese tiempo.
 */
export const GRACE_DAYS = 7;

/**
 * Cuánto se le cree a una suscripción cuyo periodo ya terminó. Stripe cobra la
 * renovación al terminar el periodo y avisa por webhook en minutos; si en 3
 * días no llegó ni el cobro ni el fallo, algo está roto (webhook caído, secreto
 * rotado) y no se regala acceso indefinido mientras se arregla.
 */
export const RENEWAL_TOLERANCE_DAYS = 3;

const DAY_MS = 86_400_000;

/** Lo mínimo de una fila `Membership` que decide si abre la puerta. */
export interface MembershipClock {
  status: AccessStatus;
  expiresAt: Date;
  graceEndsAt: Date | null;
  stripeSubscriptionId: string | null;
}

/**
 * El estado REAL de una membresía en este instante — la regla de vencimiento
 * vive aquí y en ningún otro lado.
 *
 * `status` en la base no basta: nadie hace clic en nada el día que una
 * membresía vence, así que la fila se queda en `active` hasta que algo la
 * cambie. Esta función se aplica al LEER (panel del socio, check-in en
 * sucursal) para que una membresía deje de abrir la puerta en el momento en
 * que vence, no cuando pase el cron; y el cron (`expireLapsed`) la persiste
 * para que reportes y avisos cuenten lo mismo.
 *
 * - `grace` dura hasta `graceEndsAt`. Sin fecha (dato viejo) se respeta.
 * - `active` sin suscripción vence en `expiresAt`: nada la va a renovar.
 * - `active` con suscripción aguanta `RENEWAL_TOLERANCE_DAYS` más: la
 *   renovación puede tardar un poco en llegar, y el día que falle Stripe la
 *   pasa a `past_due` y el webhook la mete en gracia.
 */
export function effectiveStatus(
  m: MembershipClock,
  now: Date = new Date(),
): AccessStatus {
  if (m.status === 'expired') return 'expired';
  if (m.status === 'grace') {
    return m.graceEndsAt && m.graceEndsAt <= now ? 'expired' : 'grace';
  }
  const tolerance = m.stripeSubscriptionId
    ? RENEWAL_TOLERANCE_DAYS * DAY_MS
    : 0;
  return m.expiresAt.getTime() + tolerance <= now.getTime()
    ? 'expired'
    : 'active';
}

export function graceDeadline(now: Date = new Date()): Date {
  return new Date(now.getTime() + GRACE_DAYS * DAY_MS);
}
