import type { MemberAccessRecord } from '@mucho-loco/types';
import { MEMBER_ACCESS_RECORDS } from '../../data';
import { delay } from './delay';

export class QrAccessMockDatasource {
  async validate(qrCode: string): Promise<MemberAccessRecord | null> {
    await delay(220); // simulates the scan + lookup roundtrip
    return MEMBER_ACCESS_RECORDS.find((r) => r.qrCode === qrCode.trim()) ?? null;
  }
}
