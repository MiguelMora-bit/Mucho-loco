import type { MemberAccessRecord, MembershipPayment, PaymentMethod, PlanKey, TierKey } from '@mucho-loco/types';
import { MembershipMockDatasource } from '../datasources/mock/membership.mock';

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

// Swap this line to plug in a real API datasource
export const membershipRepository: IMembershipRepository = new MembershipMockDatasource();
