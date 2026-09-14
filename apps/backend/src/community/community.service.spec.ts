/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest.fn() sin generics: los mocks de Prisma son deliberadamente `any`. */
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CommunityService } from './community.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CommunityService', () => {
  let service: CommunityService;
  let prisma: {
    communityPost: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
    };
    communityLike: {
      findUnique: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
    communityComment: { create: jest.Mock };
    user: { findUniqueOrThrow: jest.Mock };
    membership: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      communityPost: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      communityLike: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      communityComment: { create: jest.fn() },
      user: { findUniqueOrThrow: jest.fn() },
      membership: { findUnique: jest.fn() },
    };
    const module = await Test.createTestingModule({
      providers: [
        CommunityService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(CommunityService);
  });

  describe('getFeed', () => {
    it('derives likeCount/likedByMe from the likes relation instead of a stored counter', async () => {
      prisma.communityPost.findMany.mockResolvedValue([
        {
          id: 'post-1',
          authorName: 'Ana',
          authorBranch: 'Roma Sur',
          body: 'hola',
          createdAt: new Date('2026-06-18'),
          likes: [{ userId: 'viewer' }, { userId: 'other' }],
          comments: [],
        },
      ]);

      const feed = await service.getFeed('viewer');
      expect(feed[0].likeCount).toBe(2);
      expect(feed[0].likedByMe).toBe(true);
    });

    it('likedByMe is false for a viewer who has not liked the post', async () => {
      prisma.communityPost.findMany.mockResolvedValue([
        {
          id: 'post-1',
          authorName: 'Ana',
          authorBranch: 'Roma Sur',
          body: 'hola',
          createdAt: new Date('2026-06-18'),
          likes: [{ userId: 'other' }],
          comments: [],
        },
      ]);

      const feed = await service.getFeed('viewer');
      expect(feed[0].likedByMe).toBe(false);
    });
  });

  describe('createPost', () => {
    it('resolves authorName/authorBranch from the user + their current membership, never from an argument', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'u1',
        name: 'DIEGO',
      });
      prisma.membership.findUnique.mockResolvedValue({
        branch: { name: 'ROMA SUR' },
      });
      prisma.communityPost.create.mockResolvedValue({
        id: 'post-new',
        authorName: 'DIEGO',
        authorBranch: 'ROMA SUR',
        body: 'nuevo post',
        createdAt: new Date('2026-06-19'),
        likes: [],
        comments: [],
      });

      const post = await service.createPost('u1', 'nuevo post');

      expect(post.authorName).toBe('DIEGO');
      expect(post.authorBranch).toBe('ROMA SUR');
      expect(prisma.communityPost.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            authorId: 'u1',
            authorName: 'DIEGO',
            authorBranch: 'ROMA SUR',
            body: 'nuevo post',
          }),
        }),
      );
    });
  });

  describe('toggleLike', () => {
    const existingPost = {
      id: 'post-1',
      authorName: 'Ana',
      authorBranch: 'Roma Sur',
      body: 'hola',
      createdAt: new Date('2026-06-18'),
      likes: [],
      comments: [],
    };

    it('likes the post when the user has not liked it yet', async () => {
      prisma.communityPost.findUnique
        .mockResolvedValueOnce(existingPost)
        .mockResolvedValueOnce({ ...existingPost, likes: [{ userId: 'u1' }] });
      prisma.communityLike.findUnique.mockResolvedValue(null);

      const post = await service.toggleLike('u1', 'post-1');

      expect(prisma.communityLike.create).toHaveBeenCalledWith({
        data: { postId: 'post-1', userId: 'u1' },
      });
      expect(prisma.communityLike.delete).not.toHaveBeenCalled();
      expect(post.likedByMe).toBe(true);
    });

    it('unlikes the post on a second toggle from the same user (idempotent, not a duplicate like)', async () => {
      prisma.communityPost.findUnique
        .mockResolvedValueOnce({ ...existingPost, likes: [{ userId: 'u1' }] })
        .mockResolvedValueOnce(existingPost);
      prisma.communityLike.findUnique.mockResolvedValue({ id: 'like-1' });

      const post = await service.toggleLike('u1', 'post-1');

      expect(prisma.communityLike.delete).toHaveBeenCalledWith({
        where: { id: 'like-1' },
      });
      expect(prisma.communityLike.create).not.toHaveBeenCalled();
      expect(post.likedByMe).toBe(false);
    });

    it('404s when the post does not exist', async () => {
      prisma.communityPost.findUnique.mockResolvedValue(null);
      await expect(service.toggleLike('u1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addComment', () => {
    it('snapshots the author name from the user record, appends the comment, and returns the updated post', async () => {
      const post = {
        id: 'post-1',
        authorName: 'Ana',
        authorBranch: 'Roma Sur',
        body: 'hola',
        createdAt: new Date('2026-06-18'),
        likes: [],
        comments: [
          {
            id: 'c1',
            authorName: 'DIEGO',
            body: 'bien ahi',
            createdAt: new Date(),
          },
        ],
      };
      prisma.communityPost.findUnique
        .mockResolvedValueOnce({ ...post, comments: [] })
        .mockResolvedValueOnce(post);
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'u1',
        name: 'DIEGO',
      });

      const result = await service.addComment('u1', 'post-1', 'bien ahi');

      expect(prisma.communityComment.create).toHaveBeenCalledWith({
        data: {
          postId: 'post-1',
          authorId: 'u1',
          authorName: 'DIEGO',
          body: 'bien ahi',
        },
      });
      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].authorName).toBe('DIEGO');
    });
  });
});
