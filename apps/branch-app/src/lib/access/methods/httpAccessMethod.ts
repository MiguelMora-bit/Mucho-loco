import type { CheckInResult } from '@mucho-loco/types';
import type { AccessMethod, AccessMethodId } from '../AccessMethod';
import { api } from '../../datasources/http/client';

/**
 * Los 3 métodos de entrada contra el backend real.
 *
 * Una sola clase para los tres, parametrizada por el nombre del query, porque
 * los tres pegan al MISMO endpoint (`POST /branches/:id/check-ins`) — que a
 * su vez existe así porque los tres terminan en la misma regla de acceso. Es
 * POST porque validar registra la entrada (spec 012).
 * Agregar un cuarto método sigue siendo una línea en `index.ts`.
 *
 * Diferencia con el mock: aquí la regla la evalúa el SERVIDOR y este código
 * solo transporta el `AccessCheckResult`. Dejar pasar a alguien al gimnasio no
 * debería depender de que el cliente calcule bien — `evaluateAccess` sigue
 * viva del lado del mock y como gemela testeable de la del backend.
 */
class HttpAccessMethod implements AccessMethod {
  readonly id: AccessMethodId;
  private readonly queryKey: 'qrCode' | 'fingerprintId' | 'name';

  constructor(id: AccessMethodId, queryKey: 'qrCode' | 'fingerprintId' | 'name') {
    this.id = id;
    this.queryKey = queryKey;
  }

  async checkAccess(query: string, branchId: number): Promise<CheckInResult> {
    const value = query.trim();
    // El backend rechaza un query vacío con 400; preguntarle por nada no
    // aporta, y "no escribiste nada" es lo mismo que "no encontré a nadie".
    if (!value) return { outcome: 'not_found' };

    return api.post<CheckInResult>(`/branches/${branchId}/check-ins`, { [this.queryKey]: value });
  }
}

export const qrHttpAccessMethod: AccessMethod = new HttpAccessMethod('qr', 'qrCode');
export const fingerprintHttpAccessMethod: AccessMethod = new HttpAccessMethod('fingerprint', 'fingerprintId');
export const nameHttpAccessMethod: AccessMethod = new HttpAccessMethod('name', 'name');
