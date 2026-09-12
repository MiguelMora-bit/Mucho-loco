import type { Branch } from '@mucho-loco/types';
import type { IBranchRepository } from '../../repositories/branch.repository';
import { apiGet, apiGetOrNull } from './client';

/** Catálogo público — cambia poco, se cachea 5 min en el fetch de Next. */
const CATALOG_REVALIDATE = 300;

/** `GET /branches` de `apps/backend` (endpoints `@Public()`, sin token). */
export class BranchHttpDatasource implements IBranchRepository {
  getAll(): Promise<Branch[]> {
    return apiGet<Branch[]>('/branches', { revalidate: CATALOG_REVALIDATE });
  }

  getById(id: number): Promise<Branch | null> {
    return apiGetOrNull<Branch>(`/branches/${id}`, { revalidate: CATALOG_REVALIDATE });
  }

  getFeatured(): Promise<Branch[]> {
    return apiGet<Branch[]>('/branches/featured', { revalidate: CATALOG_REVALIDATE });
  }
}
