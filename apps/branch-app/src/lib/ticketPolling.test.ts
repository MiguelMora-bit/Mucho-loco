import { describe, it, expect } from 'vitest';
import { nextPollDelay, TICKET_POLL_LIMIT_MS, TICKET_POLL_MS } from './ticketPolling';

describe('nextPollDelay', () => {
  it('keeps asking while the key is in process', () => {
    expect(nextPollDelay('pending', 0)).toBe(TICKET_POLL_MS);
    expect(nextPollDelay('pending', TICKET_POLL_LIMIT_MS - 1)).toBe(TICKET_POLL_MS);
  });

  it('stops after the limit, and for any other status', () => {
    expect(nextPollDelay('pending', TICKET_POLL_LIMIT_MS)).toBeNull();
    expect(nextPollDelay('ready', 0)).toBeNull();
    expect(nextPollDelay('invoiced', 0)).toBeNull();
    expect(nextPollDelay('unavailable', 0)).toBeNull();
  });
});
