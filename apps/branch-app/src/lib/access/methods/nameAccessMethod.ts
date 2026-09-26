import { MEMBER_ACCESS_RECORDS } from '../../data';
import { delay } from '../../datasources/mock/delay';
import { evaluateAccess } from '../evaluateAccess';
import type { AccessMethod, CheckInResult } from '../AccessMethod';
import { withMockCheckIn } from '../mockCheckIns';

/**
 * Último recurso cuando no hay app ni funciona el lector de huella (ver
 * CLAUDE.md raíz, "Métodos de acceso") — busca por nombre en vez de un
 * credential exacto. Una coincidencia única se evalúa igual que QR/huella;
 * más de una devuelve 'ambiguous' con los candidatos — el staff pide más
 * nombre o confirma con el socio y selecciona el correcto (`QrValidationPage`
 * resuelve ese click reusando `qrAccessMethod` con el `qrCode` interno del
 * candidato, que siempre existe y es único incluso para socios dados de alta
 * por huella).
 */
export class NameAccessMethod implements AccessMethod {
  readonly id = 'name' as const;

  async checkAccess(query: string, branchId: number): Promise<CheckInResult> {
    await delay(220); // simula el lookup roundtrip
    const q = query.trim().toLowerCase();
    if (!q) return { outcome: 'not_found' };

    const matches = MEMBER_ACCESS_RECORDS.filter((r) => r.memberName.toLowerCase().includes(q));
    if (matches.length === 0) return { outcome: 'not_found' };
    if (matches.length > 1) return { outcome: 'ambiguous', candidates: matches };
    return withMockCheckIn(evaluateAccess(matches[0], branchId), branchId);
  }
}

