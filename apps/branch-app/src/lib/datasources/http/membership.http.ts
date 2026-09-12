import type { MemberAccessRecord, MembershipPayment, PaymentMethod, PlanKey, TierKey } from '@mucho-loco/types';
import type { IMembershipRepository, SignUpInput } from '../../repositories/membership.repository';
import { api } from './client';

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

  renewMembership(
    branchId: number,
    _branchName: string,
    qrCode: string,
    tierKey: TierKey,
    periodKey: PlanKey,
    paymentMethod: PaymentMethod,
  ): Promise<MembershipPayment> {
    return api.post<MembershipPayment>(`/branches/${branchId}/memberships/renew`, {
      qrCode: qrCode.trim(),
      tierKey,
      periodKey,
      paymentMethod,
    });
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
      ...(input.fingerprintId ? { fingerprintId: input.fingerprintId } : {}),
    });
  }
}
