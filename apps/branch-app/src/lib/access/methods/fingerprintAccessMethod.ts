import { MEMBER_ACCESS_RECORDS } from '../../data';
import { delay } from '../../datasources/mock/delay';
import { evaluateAccess } from '../evaluateAccess';
import type { AccessMethod, CheckInResult } from '../AccessMethod';
import { withMockCheckIn } from '../mockCheckIns';

export class FingerprintAccessMethod implements AccessMethod {
  readonly id = 'fingerprint' as const;

  async checkAccess(fingerprintId: string, branchId: number): Promise<CheckInResult> {
    await delay(220); // simula la lectura del sensor + lookup roundtrip
    const record = MEMBER_ACCESS_RECORDS.find((r) => r.fingerprintId === fingerprintId.trim());
    return withMockCheckIn(evaluateAccess(record, branchId));
  }
}

