import { MEMBER_ACCESS_RECORDS } from '../../data';
import { delay } from '../../datasources/mock/delay';
import { evaluateAccess } from '../evaluateAccess';
import type { AccessMethod, CheckInResult } from '../AccessMethod';
import { withMockCheckIn } from '../mockCheckIns';

export class QrAccessMethod implements AccessMethod {
  readonly id = 'qr' as const;

  async checkAccess(qrCode: string, branchId: number): Promise<CheckInResult> {
    await delay(220); // simula el scan + lookup roundtrip
    const record = MEMBER_ACCESS_RECORDS.find((r) => r.qrCode === qrCode.trim());
    return withMockCheckIn(evaluateAccess(record, branchId));
  }
}

