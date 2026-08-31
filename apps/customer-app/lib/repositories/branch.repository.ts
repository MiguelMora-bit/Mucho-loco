import type { Branch } from '@mucho-loco/types';
import { BranchMockDatasource } from '../datasources/mock/branch.mock';

export interface IBranchRepository {
  getAll(): Promise<Branch[]>;
  getById(id: number): Promise<Branch | null>;
  getFeatured(): Promise<Branch[]>;
}

// Swap this line to plug in a real API datasource
export const branchRepository: IBranchRepository = new BranchMockDatasource();
