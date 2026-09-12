import type { MemberAccessRecord, MembershipPayment, PaymentMethod, PlanKey, TierKey } from '@mucho-loco/types';
import { MEMBER_ACCESS_RECORDS, MEMBERSHIP_PAYMENTS } from '../../data';
import { CURRENT_BRANCH_PRICE, PERIOD_DAYS, PERIOD_MULTIPLIERS, TIER_FACTORS } from '../../membershipPlans';
import { calculateMembershipPrice } from '../../pricing';
import { delay } from './delay';
import type { SignUpInput } from '../../repositories/membership.repository';

/**
 * Antes era un contador secuencial (ML-QR-0100, 0101, ...) — solo 9900
 * combinaciones, enumerable en segundos probando el rango completo. Un QR de
 * acceso real necesita ser criptográficamente impredecible: crypto.randomUUID
 * usa el generador seguro del navegador/Node, así que adivinar un código
 * ajeno deja de ser viable por fuerza bruta. Ver auditoría de seguridad
 * 2026-09-10 (sigue sin resolver el problema de fondo: estos códigos viven en
 * el bundle JS de esta SPA, visibles para quien lea el código fuente — eso
 * requiere backend real).
 */
function generateQrCode(): string {
  return `ML-QR-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase().replace('.', '');
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export class MembershipMockDatasource {
  async findMember(qrCode: string): Promise<MemberAccessRecord | null> {
    await delay(150);
    return MEMBER_ACCESS_RECORDS.find((r) => r.qrCode === qrCode.trim()) ?? null;
  }

  async renewMembership(
    branchId: number,
    branchName: string,
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
    // Una renovación puede cambiar de tier/sucursal de inscripción — el
    // alcance de acceso (ver lib/access/evaluateAccess.ts) debe reflejar el plan nuevo.
    member.tierKey = tierKey;
    member.homeBranchId = branchId;
    member.homeBranchName = branchName;

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

  async signUpNewMember(branchId: number, branchName: string, input: SignUpInput): Promise<MembershipPayment> {
    await delay(280);
    // El qrCode interno se genera siempre (identidad del registro, usado por
    // mostrador para buscar/renovar) incluso si el socio se dará de alta con
    // huella — no necesita saber ni cargar este código, ver CLAUDE.md raíz.
    const qrCode = generateQrCode();
    const record: MemberAccessRecord = {
      qrCode,
      fingerprintId: input.fingerprintId,
      memberName: input.memberName,
      status: 'active',
      expiresAt: formatDate(addDays(new Date(), PERIOD_DAYS[input.periodKey])),
      tierKey: input.tierKey,
      homeBranchId: branchId,
      homeBranchName: branchName,
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
