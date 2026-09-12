import { describe, it, expect } from 'vitest';
import { captureFingerprint } from './fingerprintScanner';

describe('captureFingerprint', () => {
  it('returns a well-formed, non-colliding id on each simulated read', async () => {
    const ids = await Promise.all([1, 2, 3].map(() => captureFingerprint()));
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) {
      expect(id).toMatch(/^FP-[0-9A-F]{10}$/);
    }
  });
});
