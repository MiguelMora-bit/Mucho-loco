import { beforeEach, describe, expect, it } from 'vitest';
import type { MemberAccessRecord } from '@mucho-loco/types';
import { resetMockCheckIns, withMockCheckIn } from './mockCheckIns';

const record = { qrCode: 'ML-DIEGO-2026-ALLGYMS' } as MemberAccessRecord;
// 2026-09-25 08:00 y 19:00 en CDMX; el 26 a las 07:00.
const MORNING = new Date('2026-09-25T14:00:00.000Z');
const EVENING = new Date('2026-09-26T01:00:00.000Z');
const NEXT_DAY = new Date('2026-09-26T13:00:00.000Z');

beforeEach(resetMockCheckIns);

describe('withMockCheckIn (spec 012)', () => {
  it('records the first entry of the day', () => {
    const result = withMockCheckIn({ outcome: 'valid', record }, 1, MORNING);
    expect(result).toMatchObject({ checkIn: { visitedAt: MORNING.toISOString(), firstToday: true } });
  });

  // 19:00 en CDMX ya es el día siguiente en UTC: sigue siendo el mismo día del socio.
  it('reports a second scan the same Mexico City day with the first time', () => {
    withMockCheckIn({ outcome: 'valid', record }, 1, MORNING);
    const again = withMockCheckIn({ outcome: 'valid', record }, 1, EVENING);
    expect(again).toMatchObject({ checkIn: { visitedAt: MORNING.toISOString(), firstToday: false, firstBranchId: 1, firstBranch: 'Roma Sur' } });
  });

  it('starts over the next day', () => {
    withMockCheckIn({ outcome: 'valid', record }, 1, MORNING);
    const tomorrow = withMockCheckIn({ outcome: 'valid', record }, 1, NEXT_DAY);
    expect(tomorrow).toMatchObject({ checkIn: { firstToday: true } });
  });

  it('records nothing for a denied entry', () => {
    const denied = withMockCheckIn({ outcome: 'expired', record }, 1, MORNING);
    expect(denied).toEqual({ outcome: 'expired', record });
    expect(withMockCheckIn({ outcome: 'valid', record }, 1, MORNING)).toMatchObject({ checkIn: { firstToday: true } });
  });

  // Spec 020: el mismo QR en otra sucursal el mismo día dice dónde entró primero.
  it('tells where the first entry of the day was when the QR shows up at another branch', () => {
    withMockCheckIn({ outcome: 'valid', record }, 1, MORNING);
    const elsewhere = withMockCheckIn({ outcome: 'valid', record }, 3, EVENING);
    expect(elsewhere).toMatchObject({ checkIn: { firstToday: false, firstBranchId: 1, firstBranch: 'Roma Sur' } });
  });
});
