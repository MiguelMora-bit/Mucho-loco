import { MEMBER_ACCESS_RECORDS } from '../../data';
import { delay } from '../../datasources/mock/delay';
import { evaluateAccess } from '../evaluateAccess';
import type { AccessMethod, AccessCheckResult } from '../AccessMethod';

export class QrAccessMethod implements AccessMethod {
  readonly id = 'qr' as const;

  async checkAccess(qrCode: string, branchId: number): Promise<AccessCheckResult> {
    await delay(220); // simula el scan + lookup roundtrip
    const record = MEMBER_ACCESS_RECORDS.find((r) => r.qrCode === qrCode.trim());
    return evaluateAccess(record, branchId);
  }
}

