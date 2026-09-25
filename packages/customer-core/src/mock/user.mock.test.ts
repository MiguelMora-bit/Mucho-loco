import { describe, expect, it } from 'vitest';
import { UserMockDatasource } from './user.mock';

// Spec 015: una cuenta nueva (login social) llega sin teléfono y lo completa.
describe('UserMockDatasource.updatePhone', () => {
  const users = new UserMockDatasource();

  it('fills the phone of a member who had none and keeps it', async () => {
    const email = `phone.${Date.now()}@test.mx`;
    expect((await users.getProfile(email)).phone).toBe('');

    const saved = await users.updatePhone(email, '+525512345678');

    expect(saved).toMatchObject({ email, phone: '+525512345678' });
    expect((await users.getProfile(email)).phone).toBe('+525512345678');
  });
});
