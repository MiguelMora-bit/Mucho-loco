import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { generatePkce, generateState, parseState, isSafeNextPath } from './pkce';

describe('generatePkce', () => {
  it('challenge is the S256 hash of the verifier', () => {
    const { verifier, challenge } = generatePkce();
    const expected = createHash('sha256').update(verifier).digest('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(challenge).toBe(expected);
  });

  it('verifier has no base64url-unsafe characters', () => {
    const { verifier } = generatePkce();
    expect(verifier).not.toMatch(/[+/=]/);
  });
});

describe('generateState / parseState', () => {
  it('round-trips nonce and next path', () => {
    const { state, nonce } = generateState('/dashboard');
    const parsed = parseState(state);
    expect(parsed).toEqual({ nonce, nextPath: '/dashboard' });
  });

  it('preserves query params in the next path', () => {
    const { state } = generateState('/checkout?step=2');
    expect(parseState(state)?.nextPath).toBe('/checkout?step=2');
  });

  it('returns null for a malformed state (no separator)', () => {
    expect(parseState('no-dot-here')).toBeNull();
  });
});

describe('isSafeNextPath', () => {
  it('accepts internal paths', () => {
    expect(isSafeNextPath('/dashboard')).toBe(true);
  });

  it('rejects protocol-relative paths (open redirect)', () => {
    expect(isSafeNextPath('//evil.com')).toBe(false);
  });

  it('rejects absolute URLs', () => {
    expect(isSafeNextPath('https://evil.com')).toBe(false);
  });

  it('rejects paths back into /api', () => {
    expect(isSafeNextPath('/api/auth/social/start')).toBe(false);
  });
});
