import { describe, expect, it } from 'vitest';
import type { MembershipInfo } from '@mucho-loco/types';
import { purchaseBlock, renewalStartsOn } from './membership-rules';

const NOW = Date.parse('2026-09-13T12:00:00.000Z');
const DAY = 86_400_000;
const isoIn = (days: number) => new Date(NOW + days * DAY).toISOString();

function member(overrides: Partial<MembershipInfo> = {}): MembershipInfo {
  return {
    plan: '1 GYM · MENSUAL',
    branch: 'Roma Sur',
    tierKey: 'single',
    expiresAt: isoIn(20),
    visits: 0,
    streak: 0,
    daysLeft: 20,
    accessCode: 'ML-TEST',
    status: 'active',
    graceEndsAt: null,
    autoRenews: false,
    ...overrides,
  };
}

describe('purchaseBlock', () => {
  it('lets someone with no membership buy anything', () => {
    expect(purchaseBlock(null, 'monthly')).toBeNull();
    expect(purchaseBlock(null, 'visit')).toBeNull();
  });

  it('refuses a second live subscription — it would charge twice', () => {
    expect(purchaseBlock(member({ autoRenews: true }), 'annual')).toBe('ALREADY_SUBSCRIBED');
  });

  // Desde gracia puede volver a contratar: la suscripción nueva reemplaza a la que falla.
  it('lets a member in grace subscribe again', () => {
    expect(purchaseBlock(member({ autoRenews: true, status: 'grace' }), 'monthly')).toBeNull();
  });

  it('refuses a day pass on top of a valid membership, allows it once expired', () => {
    expect(purchaseBlock(member(), 'visit')).toBe('MEMBERSHIP_STILL_ACTIVE');
    expect(purchaseBlock(member({ status: 'expired' }), 'visit')).toBeNull();
  });
});

describe('renewalStartsOn', () => {
  it('keeps the time already paid at the counter: the first charge falls when it runs out', () => {
    expect(renewalStartsOn(member({ expiresAt: isoIn(20) }), NOW)).toBe(isoIn(20));
  });

  it('starts today when only a couple of days are left (Stripe needs 48 h)', () => {
    expect(renewalStartsOn(member({ expiresAt: isoIn(1) }), NOW)).toBeNull();
  });

  it('does not apply to an auto-renewing or lapsed membership', () => {
    expect(renewalStartsOn(member({ autoRenews: true }), NOW)).toBeNull();
    expect(renewalStartsOn(member({ status: 'expired' }), NOW)).toBeNull();
    expect(renewalStartsOn(null, NOW)).toBeNull();
  });
});
