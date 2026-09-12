import type { MemberAccessRecord } from '@mucho-loco/types';

export type AccessMethodId = 'qr' | 'fingerprint' | 'name';

export type AccessCheckResult =
  | { outcome: 'not_found' }
  /** Único outcome que QR/huella nunca producen — solo la búsqueda por
   *  nombre puede matchear a más de un socio a la vez. */
  | { outcome: 'ambiguous'; candidates: MemberAccessRecord[] }
  | { outcome: 'wrong_branch'; record: MemberAccessRecord }
  | { outcome: 'expired'; record: MemberAccessRecord }
  | { outcome: 'valid'; record: MemberAccessRecord };

/** true solo cuando el outcome realmente deja pasar al socio (ver CLAUDE.md
 *  raíz, "Membresía y alcance de acceso" — 'grace' cuenta como acceso
 *  permitido, con aviso, así que sigue siendo 'valid'). */
export function isAccessGranted(result: AccessCheckResult): boolean {
  return result.outcome === 'valid';
}

/**
 * Contrato compartido por los 3 métodos de entrada de mostrador — QR, huella
 * y búsqueda por nombre (este último, último recurso si no hay app y el
 * lector de huella falla) — ver CLAUDE.md de este app, "Métodos de acceso".
 *
 * Cada implementación resuelve `query` a un `MemberAccessRecord` a su manera
 * (match exacto para QR/huella; búsqueda difusa para nombre, de ahí el
 * outcome 'ambiguous' que solo ese método produce) y evalúa la MISMA regla de
 * negocio (`evaluateAccess`) sobre lo que encuentre — así que agregar un 4to
 * método de entrada nunca cambia esa regla, solo cómo se llega al registro.
 *
 * `QrValidationPage` depende únicamente de esta interfaz (Dependency
 * Inversion) — nunca de una clase concreta — así que agregar un método
 * nuevo no le toca una línea (Open/Closed) y no la obliga a conocer detalles
 * de métodos que no está usando (Interface Segregation).
 */
export interface AccessMethod {
  readonly id: AccessMethodId;
  checkAccess(query: string, branchId: number): Promise<AccessCheckResult>;
}
