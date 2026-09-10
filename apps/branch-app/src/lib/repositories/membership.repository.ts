import type { MemberAccessRecord, MembershipPayment, PaymentMethod, PlanKey, TierKey } from '@mucho-loco/types';
import { MembershipMockDatasource } from '../datasources/mock/membership.mock';

interface SignUpInput {
  memberName: string;
  phone: string;
  tierKey: TierKey;
  periodKey: PlanKey;
  paymentMethod: PaymentMethod;
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
