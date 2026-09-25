import { describe, expect, it } from 'vitest';
import type { IPaymentRepository } from '../contract';
import { membershipErrorCode } from '../membership-errors';
import { PaymentMockDatasource } from './payment.mock';
import { UserMockDatasource } from './user.mock';

/** Sin Stripe, "hacer algo en el portal" alterna la renovación (spec 005). */
describe('PaymentMockDatasource.openBillingPortal', () => {
  // Por la interfaz: el contrato recibe `cancelUrl`, aunque el mock no lo use.
  const payments: IPaymentRepository = new PaymentMockDatasource();
  const users = new UserMockDatasource();

  it('returns to the app and toggles the renewal of a subscribed member', async () => {
    const email = `portal.${Date.now()}@test.mx`;
    await payments.createMembershipCheckout(email, { branchId: 1, tierKey: 'all', periodKey: 'monthly' }, 'es', 'http://x/ok', 'http://x/no');
    expect(await users.getMembership(email)).toMatchObject({ autoRenews: true, hasSubscription: true });

    expect(await payments.openBillingPortal(email, 'http://x/dashboard', 'es')).toEqual({ url: 'http://x/dashboard' });
    expect(await users.getMembership(email)).toMatchObject({ autoRenews: false, hasSubscription: true });

    await payments.openBillingPortal(email, 'http://x/dashboard', 'es');
    expect((await users.getMembership(email))?.autoRenews).toBe(true);
  });

  it('has nothing to manage without a subscription', async () => {
    const email = `portal.visit.${Date.now()}@test.mx`;
    await payments.createMembershipCheckout(email, { branchId: 1, tierKey: 'all', periodKey: 'visit' }, 'es', 'http://x/ok', 'http://x/no');
    const err = await payments.openBillingPortal(email, 'http://x', 'es').catch((e: unknown) => e);
    expect(membershipErrorCode(err)).toBe('NO_BILLING_ACCOUNT');
  });
});
