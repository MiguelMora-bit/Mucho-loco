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

// Spec 053: los interruptores de avisos de Configuración.
describe('UserMockDatasource notification preferences', () => {
  const users = new UserMockDatasource();

  it('starts with every notice on and keeps what the member turns off', async () => {
    const email = `prefs.${Date.now()}@test.mx`;
    expect(await users.getNotificationPreferences(email)).toEqual({ membership: true, orders: true, payments: true });

    await users.updateNotificationPreferences(email, { membership: false, orders: true, payments: true });

    expect(await users.getNotificationPreferences(email)).toEqual({ membership: false, orders: true, payments: true });
  });
});
