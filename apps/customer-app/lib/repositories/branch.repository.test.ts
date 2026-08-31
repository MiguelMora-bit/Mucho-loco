import { describe, it, expect } from 'vitest';
import { branchRepository } from './branch.repository';
import { BRANCHES } from '../data';

describe('branchRepository', () => {
  it('getAll returns every mock branch', async () => {
    const branches = await branchRepository.getAll();
    expect(branches).toHaveLength(BRANCHES.length);
  });

  it('getById returns the matching branch', async () => {
    const branch = await branchRepository.getById(1);
    expect(branch?.name).toBe('ROMA SUR');
  });

  it('getById returns null for an unknown id', async () => {
    const branch = await branchRepository.getById(9999);
    expect(branch).toBeNull();
  });

  it('getFeatured only returns branches flagged as featured', async () => {
    const featured = await branchRepository.getFeatured();
    expect(featured.length).toBeGreaterThan(0);
    expect(featured.every((b) => b.featured === true)).toBe(true);
  });
});
