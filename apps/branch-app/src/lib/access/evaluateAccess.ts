import type { MemberAccessRecord } from '@mucho-loco/types';
import type { AccessCheckResult } from './AccessMethod';

/**
 * Regla de negocio de acceso al gimnasio (ver CLAUDE.md raíz, "Membresía y
 * alcance de acceso") — la MISMA sin importar qué método de entrada resolvió
 * el registro (QR, huella, nombre). Pura y sin I/O a propósito: las reglas de
 * negocio se prueban solas, sin pasar por ningún mock datasource ni delay
 * simulado — separación de "regla" (esto) y "cómo se llega al dato"
 * (cada `AccessMethod`), el corte típico de Clean Architecture entre
 * entities/use-case rules y el resto.
 */
export function evaluateAccess(record: MemberAccessRecord | undefined, branchId: number): AccessCheckResult {
  if (!record) return { outcome: 'not_found' };

  // Vencida deniega en cualquier sucursal, antes que el chequeo de tier/sucursal
  // (una membresía inválida lo es en todos lados, no solo "en la sucursal equivocada").
  if (record.status === 'expired') {
    return { outcome: 'expired', record };
  }
  if (record.tierKey === 'single' && record.homeBranchId !== branchId) {
    return { outcome: 'wrong_branch', record };
  }
  return { outcome: 'valid', record };
}
