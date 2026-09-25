import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TicketHttpDatasource } from './ticket.http';
import { ApiRequestError } from './client';
import { TicketNotFoundError } from '../../repositories/ticket.errors';
import { useAuthStore } from '../../stores/auth.store';

function stubFetch(status = 200, body: unknown = {}) {
  const spy = vi.fn(
    async (...args: [string | URL, RequestInit?]) =>
      args && new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
  vi.stubGlobal('fetch', spy);
  return spy;
}

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', 'http://api.test');
  useAuthStore.getState().setSession({
    user: { email: 'luis@mucholoco.mx', name: 'Luis', role: 'staff', branchId: 1, branchName: 'Roma Sur' },
    idToken: 'id-token',
    refreshToken: 'refresh',
    idTokenExp: Math.floor(Date.now() / 1000) + 3600,
  });
});

afterEach(() => {
  useAuthStore.getState().clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('TicketHttpDatasource', () => {
  it('asks the branch for the ticket of a sale, with the token and lang, escaping the id', async () => {
    const spy = stubFetch(200, { kind: 'sale' });
    await new TicketHttpDatasource().getTicket('sale', '#CS 1', 1);

    const url = new URL(String(spy.mock.calls[0][0]));
    expect(url.pathname).toBe('/branches/1/tickets/sale/%23CS%201');
    expect(url.searchParams.get('lang')).toMatch(/^(es|en)$/);
    expect((spy.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe('Bearer id-token');
  });

  it('reads TICKET_NOT_FOUND as the typed error the mock throws', async () => {
    stubFetch(404, { code: 'TICKET_NOT_FOUND' });
    await expect(new TicketHttpDatasource().getTicket('membership', 'x', 2)).rejects.toBeInstanceOf(TicketNotFoundError);
  });

  it('lets a dead backend through as what it is', async () => {
    stubFetch(500, { message: 'boom' });
    await expect(new TicketHttpDatasource().getTicket('sale', 'x', 1)).rejects.toBeInstanceOf(ApiRequestError);
  });
});
