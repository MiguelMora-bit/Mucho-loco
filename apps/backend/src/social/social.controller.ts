import { Controller, Get } from '@nestjs/common';
import type { FeedPost, SocialLink } from '@mucho-loco/types';
import { SocialService } from './social.service';
import { Public } from '../auth/public.decorator';

/** Feed de marketing (redes externas del gym) — público, vive en el landing
 *  (Contact). Distinto de /community (feed interno entre socios). */
@Controller('social')
export class SocialController {
  constructor(private social: SocialService) {}

  @Public()
  @Get('links')
  getLinks(): Promise<SocialLink[]> {
    return this.social.getLinks();
  }

  @Public()
  @Get('feed')
  getFeed(): Promise<FeedPost[]> {
    return this.social.getFeed();
  }
}
