import { describe, it, expect } from 'vitest';
import { isProtected, PROTECTED_PATHS } from './auth';

describe('isProtected', () => {
  it.each(PROTECTED_PATHS)('protects the exact path %s', (path) => {
    expect(isProtected(path)).toBe(true);
  });

  it('protects nested sub-paths', () => {
    expect(isProtected('/dashboard/settings')).toBe(true);
    expect(isProtected('/product/checkout/nope')).toBe(false); // not a real sub-path of any protected root
  });

  // Facturar muestra RFC y cobros: es cuenta, como el panel.
  it('protects the invoicing page', () => {
    expect(isProtected('/invoicing')).toBe(true);
  });

  it('does not protect unrelated paths', () => {
    expect(isProtected('/')).toBe(false);
    expect(isProtected('/account')).toBe(false);
    expect(isProtected('/product/p1')).toBe(false);
  });

  it('does not treat a path merely prefixed by a protected name as protected (no separator)', () => {
    // e.g. a future /dashboards-public route should NOT be swept in by a naive startsWith('/dashboard')
    expect(isProtected('/dashboards-public')).toBe(false);
  });
});
