import type { CardType, MemberAccessRecord, MembershipPayment, OverdueBalance, PaymentMethod, PlanKey, TierKey } from '@mucho-loco/types';
import type { IMembershipRepository, SignUpInput } from '../../repositories/membership.repository';
import { ApiRequestError, api } from './client';
import { MemberRenewsOnlineError, NothingOverdueError, OverduePaymentFailedError } from '../../repositories/membership.errors';

/**
 * Membresías de mostrador.
 *
 * Dos cosas que el backend hace distinto al mock, a propósito:
 *
 * - **El precio lo pone la sucursal que cobra.** El mock usaba
 *   `CURRENT_BRANCH_PRICE = 1090` fijo, así que Coyoacán ($890) y Santa Fe
 *   ($1390) cobraban precio de Roma Sur. Por eso `branchName` ya no se manda:
 *   el backend resuelve la sucursal desde el `branchId` de la ruta.
 * - **`expiresAt` viaja en ISO**, no como `'20 JUL 2026'`. Quien lo pinta lo
 *   formatea (ver `lib/dates.ts`).
 */
export class MembershipHttpDatasource implements IMembershipRepository {
  /** `null` cuando no existe: el backend responde 200 con cuerpo vacío. */
  async findMember(qrCode: string): Promise<MemberAccessRecord | null> {
    const record = await api.get<MemberAccessRecord | null>('/members', {
      query: { qrCode: qrCode.trim() },
    });
    return record ?? null;
  }

  async renewMembership(
    branchId: number,
    _branchName: string,
    qrCode: string,
    tierKey: TierKey,
    periodKey: PlanKey,
    paymentMethod: PaymentMethod,
    cardType?: CardType,
  ): Promise<MembershipPayment> {
    try {
      return await api.post<MembershipPayment>(`/branches/${branchId}/memberships/renew`, {
        qrCode: qrCode.trim(),
        tierKey,
        periodKey,
        paymentMethod,
        ...(paymentMethod === 'card' && cardType ? { cardType } : {}),
      });
    } catch (e) {
      // Spec 006: el socio se cobra solo en línea — mismo error tipado que el mock.
      if (e instanceof ApiRequestError && e.code === 'MEMBER_RENEWS_ONLINE') {
        throw new MemberRenewsOnlineError(qrCode.trim());
      }
      throw e;
    }
  }

  signUpNewMember(
    branchId: number,
    _branchName: string,
    input: SignUpInput,
  ): Promise<MembershipPayment> {
    return api.post<MembershipPayment>(`/branches/${branchId}/memberships/signup`, {
      memberName: input.memberName,
      phone: input.phone,
      tierKey: input.tierKey,
      periodKey: input.periodKey,
      paymentMethod: input.paymentMethod,
      ...(input.paymentMethod === 'card' && input.cardType ? { cardType: input.cardType } : {}),
      ...(input.fingerprintId ? { fingerprintId: input.fingerprintId } : {}),
    });
  }

  /** 409 `NOTHING_TO_PAY` (sin suscripción, sin gracia o sin factura abierta) y 404 → `null`. */
  async getOverdue(branchId: number, qrCode: string): Promise<OverdueBalance | null> {
    try {
      return await api.get<OverdueBalance>(`/branches/${branchId}/memberships/overdue`, {
        query: { qrCode: qrCode.trim() },
      });
    } catch (e) {
      if (e instanceof ApiRequestError && (e.code === 'NOTHING_TO_PAY' || e.status === 404)) return null;
      throw e;
    }
  }

  async settleOverdue(
    branchId: number,
    qrCode: string,
    paymentMethod: PaymentMethod,
    cardType?: CardType,
  ): Promise<MembershipPayment> {
    try {
      return await api.post<MembershipPayment>(`/branches/${branchId}/memberships/overdue`, {
        qrCode: qrCode.trim(),
        paymentMethod,
        ...(paymentMethod === 'card' && cardType ? { cardType } : {}),
      });
    } catch (e) {
      if (e instanceof ApiRequestError && e.code === 'NOTHING_TO_PAY') throw new NothingOverdueError(qrCode.trim());
      if (e instanceof ApiRequestError && e.code === 'PAYMENT_PROVIDER_ERROR') throw new OverduePaymentFailedError(qrCode.trim());
      throw e;
    }
  }
}
