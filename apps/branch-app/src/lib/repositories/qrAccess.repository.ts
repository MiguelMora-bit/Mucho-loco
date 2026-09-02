import type { MemberAccessRecord } from '@mucho-loco/types';
import { QrAccessMockDatasource } from '../datasources/mock/qrAccess.mock';

export interface IQrAccessRepository {
  validate(qrCode: string): Promise<MemberAccessRecord | null>;
}

// Swap this line to plug in a real API datasource
export const qrAccessRepository: IQrAccessRepository = new QrAccessMockDatasource();
