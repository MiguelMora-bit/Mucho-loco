import { Injectable, NotFoundException } from '@nestjs/common';
import type { CommunityPost } from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CommunityPost as PostRow,
  CommunityLike as LikeRow,
  CommunityComment as CommentRow,
} from '@prisma/client';

type PostWithRelations = PostRow & {
  likes: LikeRow[];
  comments: CommentRow[];
};

const feedInclude = {
  likes: true,
  comments: { orderBy: { createdAt: 'asc' as const } },
};

// likedByMe es relativo a quien pide el feed — igual que el mock
// (getFeed(email)), aquí viewerUserId sale de @CurrentUser(), nunca de un
// parámetro que el cliente pueda falsear (ver "3 decisiones que NO son
// fieles al mock" en el CLAUDE.md de este backend).
function toPublic(
  post: PostWithRelations,
  viewerUserId: string,
): CommunityPost {
  return {
    id: post.id,
    authorName: post.authorName,
    authorBranch: post.authorBranch,
    body: post.body,
    createdAt: post.createdAt.toISOString(),
    likeCount: post.likes.length,
    likedByMe: post.likes.some((like) => like.userId === viewerUserId),
    comments: post.comments.map((c) => ({
      id: c.id,
      authorName: c.authorName,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}

@Injectable()
export class CommunityService {
  constructor(private prisma: PrismaService) {}

  private async findPostOrThrow(postId: string): Promise<PostWithRelations> {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      include: feedInclude,
    });
    if (!post)
      throw new NotFoundException(`Community post not found: ${postId}`);
    return post;
  }

  async getFeed(viewerUserId: string): Promise<CommunityPost[]> {
    const rows = await this.prisma.communityPost.findMany({
      include: feedInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => toPublic(row, viewerUserId));
  }

  /** authorName/authorBranch se resuelven aquí (usuario + su sucursal
   *  actual), nunca se reciben del cliente — a diferencia del mock
   *  (createPost(email, authorName, authorBranch, body)), que confiaba en
   *  lo que mandaba el frontend. */
  async createPost(authorId: string, body: string): Promise<CommunityPost> {
    const [user, membership] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: authorId } }),
      this.prisma.membership.findUnique({
        where: { userId: authorId },
        include: { branch: true },
      }),
    ]);
    const post = await this.prisma.communityPost.create({
      data: {
        authorId,
        authorName: user.name,
        // Un socio recién registrado todavía no tiene membresía (nace sin
        // ella) y puede publicar igual: su post sale sin sucursal.
        authorBranch: membership?.branch.name ?? '',
        body,
      },
      include: feedInclude,
    });
    return toPublic(post, authorId);
  }

  async toggleLike(userId: string, postId: string): Promise<CommunityPost> {
    await this.findPostOrThrow(postId);
    const existing = await this.prisma.communityLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) {
      await this.prisma.communityLike.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.communityLike.create({ data: { postId, userId } });
    }
    const post = await this.findPostOrThrow(postId);
    return toPublic(post, userId);
  }

  async addComment(
    authorId: string,
    postId: string,
    body: string,
  ): Promise<CommunityPost> {
    await this.findPostOrThrow(postId);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: authorId },
    });
    await this.prisma.communityComment.create({
      data: { postId, authorId, authorName: user.name, body },
    });
    const post = await this.findPostOrThrow(postId);
    return toPublic(post, authorId);
  }
}
