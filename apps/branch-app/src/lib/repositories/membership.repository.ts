import type { CardType, MemberAccessRecord, MembershipPayment, OverdueBalance, PaymentMethod, PlanKey, TierKey } from '@mucho-loco/types';
import { MembershipMockDatasource } from '../datasources/mock/membership.mock';
import { MembershipHttpDatasource } from '../datasources/http/membership.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

export { MemberRenewsOnlineError, NothingOverdueError, OverduePaymentFailedError } from './membership.errors';

export interface SignUpInput {
  memberName: string;
  phone: string;
  tierKey: TierKey;
  periodKey: PlanKey;
  paymentMethod: PaymentMethod;
  /** Crédito o débito, solo con `card` (spec 009). */
  cardType?: CardType;
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
    paymentMethod: PaymentMethod,
    cardType?: CardType
  ): Promise<MembershipPayment>;
  signUpNewMember(branchId: number, branchName: string, input: SignUpInput): Promise<MembershipPayment>;
  /**
   * Spec 019: el atraso de la suscripción de un socio en gracia (lo que Stripe
   * no pudo cobrar), o `null` si no hay nada pendiente.
   */
  getOverdue(branchId: number, qrCode: string): Promise<OverdueBalance | null>;
  /** Cobrarlo aquí: la suscripción sigue viva. `NothingOverdueError` / `OverduePaymentFailedError`. */
  settleOverdue(branchId: number, qrCode: string, paymentMethod: PaymentMethod, cardType?: CardType): Promise<MembershipPayment>;
}

// Mock o backend NestJS real, según VITE_DATA_SOURCE — ver datasources/http/config.ts.
export const membershipRepository: IMembershipRepository = isHttpDatasourceEnabled()
  ? new MembershipHttpDatasource()
  : new MembershipMockDatasource();
