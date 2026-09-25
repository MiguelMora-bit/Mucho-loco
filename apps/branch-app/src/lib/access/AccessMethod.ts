// AccessMethodId, AccessCheckResult y CheckInResult viven en @mucho-loco/types:
// el backend aplica la misma regla (y registra la entrada) en
// POST /branches/:id/check-ins, así que el contrato no es exclusivo de este
// app. Se re-exportan para no tocar a sus importadores.
import type { AccessCheckResult, AccessMethodId, CheckInResult } from '@mucho-loco/types';

export type { AccessCheckResult, AccessMethodId, CheckInResult };

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
  /** Validar ES registrar la entrada (spec 012): un acceso permitido trae
   *  `checkIn` — la hora de la entrada del día y si fue la primera. */
  checkAccess(query: string, branchId: number): Promise<CheckInResult>;
}
