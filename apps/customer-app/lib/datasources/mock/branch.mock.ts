import type { Branch } from '@mucho-loco/types';
import { BRANCHES } from '../../data';
import { delay } from './delay';

export class BranchMockDatasource {
  async getAll(): Promise<Branch[]> {
    await delay(160);
    return BRANCHES;
  }

  async getById(id: number): Promise<Branch | null> {
    await delay(80);
    return BRANCHES.find((b) => b.id === id) ?? null;
  }

  async getFeatured(): Promise<Branch[]> {
    await delay(80);
    return BRANCHES.filter((b) => b.featured);
  }
}
