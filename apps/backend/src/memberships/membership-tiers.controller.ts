import { Controller, Get } from '@nestjs/common';
import type { MembershipTier } from '@mucho-loco/types';
import { MembershipsService } from './memberships.service';
import { Public } from '../auth/public.decorator';

/** Catálogo público (landing) — no confundir con la membresía del socio, ver UsersController. */
@Controller('membership-tiers')
export class MembershipTiersController {
  constructor(private memberships: MembershipsService) {}

  @Public()
  @Get()
  getTiers(): Promise<MembershipTier[]> {
    return this.memberships.getTiers();
  }
}
