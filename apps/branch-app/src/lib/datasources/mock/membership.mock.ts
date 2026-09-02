import type { MemberAccessRecord, MembershipPayment, PaymentMethod, PlanKey, TierKey } from '@mucho-loco/types';
import { MEMBER_ACCESS_RECORDS, MEMBERSHIP_PAYMENTS } from '../../data';
import { CURRENT_BRANCH_PRICE, PERIOD_DAYS, PERIOD_MULTIPLIERS, TIER_FACTORS } from '../../membershipPlans';
import { calculateMembershipPrice } from '../../pricing';
import { delay } from './delay';

let nextQrSeq = 100;

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase().replace('.', '');
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

interface SignUpInput {
  memberName: string;
  phone: string;
  tierKey: TierKey;
  periodKey: PlanKey;
  paymentMethod: PaymentMethod;
}

export class MembershipMockDatasource {
  async findMember(qrCode: string): Promise<MemberAccessRecord | null> {
    await delay(150);
    return MEMBER_ACCESS_RECORDS.find((r) => r.qrCode === qrCode.trim()) ?? null;
  }

  async renewMembership(
    branchId: number,
    qrCode: string,
    tierKey: TierKey,
    periodKey: PlanKey,
    paymentMethod: PaymentMethod
  ): Promise<MembershipPayment> {
    await delay(250);
    const member = MEMBER_ACCESS_RECORDS.find((r) => r.qrCode === qrCode.trim());
    if (!member) throw new Error(`Member QR code not found: ${qrCode}`);

    member.status = 'active';
    member.expiresAt = formatDate(addDays(new Date(), PERIOD_DAYS[periodKey]));

    const payment: MembershipPayment = {
      id: `#MP-${Date.now()}`,
      branchId,
      qrCode: member.qrCode,
      memberName: member.memberName,
      phone: '',
      tierKey,
      periodKey,
      amount: calculateMembershipPrice(CURRENT_BRANCH_PRICE, TIER_FACTORS[tierKey], PERIOD_MULTIPLIERS[periodKey]),
      paymentMethod,
      isNewMember: false,
      createdAt: new Date().toISOString(),
    };
    MEMBERSHIP_PAYMENTS.push(payment);
    return payment;
  }

  async signUpNewMember(branchId: number, input: SignUpInput): Promise<MembershipPayment> {
    await delay(280);
    const qrCode = `ML-QR-${(nextQrSeq++).toString().padStart(4, '0')}`;
    const record: MemberAccessRecord = {
      qrCode,
      memberName: input.memberName,
      status: 'active',
      expiresAt: formatDate(addDays(new Date(), PERIOD_DAYS[input.periodKey])),
    };
    MEMBER_ACCESS_RECORDS.push(record);

    const payment: MembershipPayment = {
      id: `#MP-${Date.now()}`,
      branchId,
      qrCode,
      memberName: input.memberName,
      phone: input.phone,
      tierKey: input.tierKey,
      periodKey: input.periodKey,
      amount: calculateMembershipPrice(CURRENT_BRANCH_PRICE, TIER_FACTORS[input.tierKey], PERIOD_MULTIPLIERS[input.periodKey]),
      paymentMethod: input.paymentMethod,
      isNewMember: true,
      createdAt: new Date().toISOString(),
    };
    MEMBERSHIP_PAYMENTS.push(payment);
    return payment;
  }
}
