import { describe, it, expect } from 'vitest';
import { NameAccessMethod } from './nameAccessMethod';

// Se instancia aquí: el singleton exportado ahora vive en index.ts y
// depende de VITE_DATA_SOURCE. Estos tests son del método MOCK.
const nameAccessMethod = new NameAccessMethod();

const ROMA_SUR = 1;
const CONDESA = 3;

describe('nameAccessMethod', () => {
  it('has the name id', () => {
    expect(nameAccessMethod.id).toBe('name');
  });

  it('evaluates access normally when exactly one member matches', async () => {
    const result = await nameAccessMethod.checkAccess('diego ramírez', ROMA_SUR);
    expect(result.outcome).toBe('valid');
  });

  it('matches case-insensitively and by partial name', async () => {
    const result = await nameAccessMethod.checkAccess('valeria', CONDESA);
    expect(result.outcome).toBe('valid');
  });

  it('applies the same branch/tier rule as QR and fingerprint', async () => {
    const result = await nameAccessMethod.checkAccess('valeria', ROMA_SUR);
    expect(result.outcome).toBe('wrong_branch');
  });

  it('returns ambiguous with every candidate when more than one member matches', async () => {
    const result = await nameAccessMethod.checkAccess('carlos', ROMA_SUR);
    expect(result.outcome).toBe('ambiguous');
    if (result.outcome === 'ambiguous') {
      expect(result.candidates.map((c) => c.memberName).sort()).toEqual(['Carlos Mendoza', 'Carlos Vega']);
    }
  });

  it('returns not_found for a name with no match', async () => {
    const result = await nameAccessMethod.checkAccess('Nadie Existe', ROMA_SUR);
    expect(result.outcome).toBe('not_found');
  });

  it('returns not_found for an empty or blank query, without matching everything', async () => {
    const result = await nameAccessMethod.checkAccess('   ', ROMA_SUR);
    expect(result.outcome).toBe('not_found');
  });
});
