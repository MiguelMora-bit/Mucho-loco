import type { Branch } from '@mucho-loco/types';
import { BranchMockDatasource } from '../datasources/mock/branch.mock';
import { BranchHttpDatasource } from '../datasources/http/branch.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

export interface IBranchRepository {
  getAll(): Promise<Branch[]>;
  getById(id: number): Promise<Branch | null>;
  getFeatured(): Promise<Branch[]>;
}

// Mock o backend NestJS real, según NEXT_PUBLIC_DATA_SOURCE — ver datasources/http/config.ts.
export const branchRepository: IBranchRepository = isHttpDatasourceEnabled()
  ? new BranchHttpDatasource()
  : new BranchMockDatasource();
