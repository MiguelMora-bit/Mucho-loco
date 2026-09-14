import {
  effectiveStatus,
  graceDeadline,
  GRACE_DAYS,
  RENEWAL_TOLERANCE_DAYS,
  type MembershipClock,
} from './membership-status';

const NOW = new Date('2026-09-13T15:00:00.000Z');
const DAY = 86_400_000;
const at = (days: number): Date => new Date(NOW.getTime() + days * DAY);

function membership(overrides: Partial<MembershipClock> = {}): MembershipClock {
  return {
    status: 'active',
    expiresAt: at(10),
    graceEndsAt: null,
    stripeSubscriptionId: null,
    ...overrides,
  };
}

describe('effectiveStatus', () => {
  it('keeps an active membership active until it expires', () => {
    expect(effectiveStatus(membership(), NOW)).toBe('active');
  });

  // El bug que esto arregla: nada cambiaba `status` al vencer, así que una
  // membresía vencida seguía abriendo la puerta para siempre.
  it('expires a membership nobody renews the moment expiresAt passes', () => {
    expect(effectiveStatus(membership({ expiresAt: at(-0.01) }), NOW)).toBe(
      'expired',
    );
  });

  it('gives a subscription a few days for the renewal webhook to arrive', () => {
    const sub = { stripeSubscriptionId: 'sub_1' };
    expect(
      effectiveStatus(membership({ ...sub, expiresAt: at(-1) }), NOW),
    ).toBe('active');
    expect(
      effectiveStatus(
        membership({ ...sub, expiresAt: at(-RENEWAL_TOLERANCE_DAYS - 0.01) }),
        NOW,
      ),
    ).toBe('expired');
  });

  it('lets a member in grace in until the grace period ends, then suspends', () => {
    const grace = { status: 'grace' as const, expiresAt: at(-2) };
    expect(
      effectiveStatus(membership({ ...grace, graceEndsAt: at(1) }), NOW),
    ).toBe('grace');
    expect(
      effectiveStatus(membership({ ...grace, graceEndsAt: at(-0.01) }), NOW),
    ).toBe('expired');
  });

  it('never revives an expired membership on read', () => {
    expect(
      effectiveStatus(
        membership({ status: 'expired', expiresAt: at(30) }),
        NOW,
      ),
    ).toBe('expired');
  });
});

describe('graceDeadline', () => {
  it(`is ${GRACE_DAYS} days after the failed charge`, () => {
    expect(graceDeadline(NOW).getTime() - NOW.getTime()).toBe(GRACE_DAYS * DAY);
  });
});
