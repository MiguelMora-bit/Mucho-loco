import type { MemberAccessRecord, MembershipPayment, PaymentMethod, PlanKey, TierKey } from '@mucho-loco/types';
import { MembershipMockDatasource } from '../datasources/mock/membership.mock';
import { MembershipHttpDatasource } from '../datasources/http/membership.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

export { MemberRenewsOnlineError } from './membership.errors';

export interface SignUpInput {
  memberName: string;
  phone: string;
  tierKey: TierKey;
  periodKey: PlanKey;
  paymentMethod: PaymentMethod;
  /** Presente cuando el alta se hizo por huella en vez de QR (ver
   *  CLAUDE.md raíz, "Métodos de acceso") — el registro sigue teniendo un
   *  qrCode interno, pero el acceso real se valida por este id. */
  fingerprintId?: string;
}

export interface IMembershipRepository {
  findMember(qrCode: string): Promise<MemberAccessRecord | null>;
  renewMembership(
    branchId: number,
    branchName: string,
    qrCode: string,
    tierKey: TierKey,
    periodKey: PlanKey,
    paymentMethod: PaymentMethod
  ): Promise<MembershipPayment>;
  signUpNewMember(branchId: number, branchName: string, input: SignUpInput): Promise<MembershipPayment>;
}

// Mock o backend NestJS real, según VITE_DATA_SOURCE — ver datasources/http/config.ts.
export const membershipRepository: IMembershipRepository = isHttpDatasourceEnabled()
  ? new MembershipHttpDatasource()
  : new MembershipMockDatasource();
