import type { MembershipTier } from '@mucho-loco/types';
import type { IMembershipRepository } from '../../repositories/membership.repository';
import { apiGet } from './client';

const CATALOG_REVALIDATE = 300;

/** Catálogo público de tiers (`single`/`all`) — no la membresía del socio, que vive en user.http.ts. */
export class MembershipHttpDatasource implements IMembershipRepository {
  getTiers(): Promise<MembershipTier[]> {
    return apiGet<MembershipTier[]>('/membership-tiers', { revalidate: CATALOG_REVALIDATE });
  }
}
