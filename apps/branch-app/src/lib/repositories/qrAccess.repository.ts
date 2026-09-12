import type { MemberAccessRecord } from '@mucho-loco/types';
import { QrAccessMockDatasource } from '../datasources/mock/qrAccess.mock';

export type QrValidationResult =
  | { outcome: 'not_found' }
  | { outcome: 'wrong_branch'; record: MemberAccessRecord }
  | { outcome: 'expired'; record: MemberAccessRecord }
  | { outcome: 'valid'; record: MemberAccessRecord };

export interface IQrAccessRepository {
  /** branchId = sucursal donde se está escaneando (ver getCurrentBranchId) — decide 'wrong_branch' para tier 'single'. 'expired' deniega el acceso sin importar sucursal/tier. */
  validate(qrCode: string, branchId: number): Promise<QrValidationResult>;
  /** Mismo resultado/reglas que validate(), pero busca por huella dactilar en vez de QR — para socios dados de alta sin la app (ver CLAUDE.md raíz, "Métodos de acceso"). */
  validateByFingerprint(fingerprintId: string, branchId: number): Promise<QrValidationResult>;
}

// Swap this line to plug in a real API datasource
export const qrAccessRepository: IQrAccessRepository = new QrAccessMockDatasource();
