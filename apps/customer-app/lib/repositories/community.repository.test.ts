import { describe, it, expect } from 'vitest';
import { communityRepository } from './community.repository';
import { ALL_GYMS_TEST_EMAIL, SINGLE_GYM_TEST_EMAIL } from '../datasources/mock/user.mock';

describe('communityRepository', () => {
  it('getFeed returns the seeded posts, newest first', async () => {
    const feed = await communityRepository.getFeed(ALL_GYMS_TEST_EMAIL);
    expect(feed.length).toBeGreaterThanOrEqual(3);
    const dates = feed.map((p) => new Date(p.createdAt).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it('reflects likes relative to the viewer, not globally', async () => {
    const asDiego = await communityRepository.getFeed(ALL_GYMS_TEST_EMAIL);
    const asValeria = await communityRepository.getFeed(SINGLE_GYM_TEST_EMAIL);
    const post = asDiego.find((p) => p.id === 'post-1')!;
    const samePostForValeria = asValeria.find((p) => p.id === 'post-1')!;
    expect(post.likedByMe).toBe(true);
    expect(samePostForValeria.likedByMe).toBe(false);
    expect(post.likeCount).toBe(samePostForValeria.likeCount);
  });

  it('createPost adds a post that then shows up in getFeed', async () => {
    const created = await communityRepository.createPost(SINGLE_GYM_TEST_EMAIL, 'Valeria Torres', 'Condesa', 'Hola mundo');
    expect(created.body).toBe('Hola mundo');
    expect(created.likeCount).toBe(0);
    expect(created.comments).toEqual([]);

    const feed = await communityRepository.getFeed(SINGLE_GYM_TEST_EMAIL);
    expect(feed[0].id).toBe(created.id);
  });

  it('toggleLike flips likedByMe and likeCount for that viewer only', async () => {
    const created = await communityRepository.createPost(ALL_GYMS_TEST_EMAIL, 'Diego Ramírez', 'Roma Sur', 'Post de prueba');

    const liked = await communityRepository.toggleLike(SINGLE_GYM_TEST_EMAIL, created.id);
    expect(liked.likedByMe).toBe(true);
    expect(liked.likeCount).toBe(1);

    const unliked = await communityRepository.toggleLike(SINGLE_GYM_TEST_EMAIL, created.id);
    expect(unliked.likedByMe).toBe(false);
    expect(unliked.likeCount).toBe(0);
  });

  it('addComment appends a comment visible to every viewer', async () => {
    const created = await communityRepository.createPost(ALL_GYMS_TEST_EMAIL, 'Diego Ramírez', 'Roma Sur', 'Otro post de prueba');

    const updated = await communityRepository.addComment(SINGLE_GYM_TEST_EMAIL, 'Valeria Torres', created.id, 'Buen post');
    expect(updated.comments).toHaveLength(1);
    expect(updated.comments[0].body).toBe('Buen post');

    const feed = await communityRepository.getFeed(ALL_GYMS_TEST_EMAIL);
    expect(feed.find((p) => p.id === created.id)?.comments).toHaveLength(1);
  });
});
