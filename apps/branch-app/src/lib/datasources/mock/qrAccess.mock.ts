import { MEMBER_ACCESS_RECORDS } from '../../data';
import { delay } from './delay';
import type { QrValidationResult } from '../../repositories/qrAccess.repository';

export class QrAccessMockDatasource {
  async validate(qrCode: string, branchId: number): Promise<QrValidationResult> {
    await delay(220); // simulates the scan + lookup roundtrip
    const record = MEMBER_ACCESS_RECORDS.find((r) => r.qrCode === qrCode.trim());
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
}
