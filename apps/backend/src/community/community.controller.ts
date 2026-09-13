import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { CommunityPost } from '@mucho-loco/types';
import { CommunityService } from './community.service';
import { UsersService } from '../users/users.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { IdTokenClaims } from '../auth/cognito';
import { CreatePostDto } from './dto/create-post.dto';
import { AddCommentDto } from './dto/add-comment.dto';

/** Feed interno entre socios — todo detrás de CognitoAuthGuard (default
 *  global). "Yo" siempre sale del ID token, nunca de un email en el body
 *  (mismo criterio que /users/me, ver su CLAUDE.md). */
@Controller('community/posts')
export class CommunityController {
  constructor(
    private community: CommunityService,
    private users: UsersService,
  ) {}

  @Get()
  async getFeed(@CurrentUser() user: IdTokenClaims): Promise<CommunityPost[]> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    return this.community.getFeed(dbUser.id);
  }

  @Post()
  async createPost(
    @CurrentUser() user: IdTokenClaims,
    @Body() dto: CreatePostDto,
  ): Promise<CommunityPost> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    return this.community.createPost(dbUser.id, dto.body);
  }

  @Post(':id/like')
  async toggleLike(
    @CurrentUser() user: IdTokenClaims,
    @Param('id') postId: string,
  ): Promise<CommunityPost> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    return this.community.toggleLike(dbUser.id, postId);
  }

  @Post(':id/comments')
  async addComment(
    @CurrentUser() user: IdTokenClaims,
    @Param('id') postId: string,
    @Body() dto: AddCommentDto,
  ): Promise<CommunityPost> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    return this.community.addComment(dbUser.id, postId, dto.body);
  }
}
