import type { CommunityPost } from '@mucho-loco/types';
import { delay } from './delay';
import type { ICommunityRepository } from '../contract';
import { UserMockDatasource } from './user.mock';

// likedBy vive solo del lado del mock (quién le dio like) — nunca se expone
// tal cual, cada lectura lo proyecta a { likeCount, likedByMe } relativo a
// quien pide el feed (ver toPublic).
interface StoredPost extends Omit<CommunityPost, 'likeCount' | 'likedByMe'> {
  likedBy: Set<string>;
}

// Mismo motivo que __mlUserRecords en user.mock.ts: Next.js separa Server
// Components y Route Handlers en distintas capas de módulo — sin globalThis
// un post creado vía POST /api/community/posts nunca aparecería en el feed
// que lee el dashboard.
declare global {
  var __mlCommunityPosts: StoredPost[] | undefined;
}

function seedPosts(): StoredPost[] {
  return [
    {
      id: 'post-3',
      authorName: 'Ana López',
      authorBranch: 'Roma Sur',
      body: '¡Nuevo récord en peso muerto hoy! 💪 Gracias a los coaches de Roma Sur por el empujón.',
      createdAt: '2026-06-18T19:20:00.000Z',
      likedBy: new Set(['diego@mucholoco.mx']),
      comments: [{ id: 'c-seed-1', authorName: 'Diego Ramírez', body: '¡Bestia! 🔥', createdAt: '2026-06-18T19:45:00.000Z' }],
    },
    {
      id: 'post-2',
      authorName: 'Carlos Mendoza',
      authorBranch: 'Interlomas',
      body: '¿Alguien más para correr mañana antes de entrenar? Salida 7am en Interlomas.',
      createdAt: '2026-06-17T10:05:00.000Z',
      likedBy: new Set(),
      comments: [],
    },
    {
      id: 'post-1',
      authorName: 'Valeria Torres',
      authorBranch: 'Condesa',
      body: 'Un mes cumplido con mi rutina — las gomitas de proteína del shop ya son mi snack post-entreno favorito 🍬',
      createdAt: '2026-06-15T21:00:00.000Z',
      likedBy: new Set(['diego@mucholoco.mx']),
      comments: [{ id: 'c-seed-2', authorName: 'Diego Ramírez', body: 'Están buenísimas jaja', createdAt: '2026-06-16T08:00:00.000Z' }],
    },
  ];
}

const POSTS: StoredPost[] = globalThis.__mlCommunityPosts ?? (globalThis.__mlCommunityPosts = seedPosts());

function toPublic(post: StoredPost, viewerEmail: string): CommunityPost {
  const { likedBy, ...rest } = post;
  return { ...rest, likeCount: likedBy.size, likedByMe: likedBy.has(viewerEmail) };
}

function findPost(postId: string): StoredPost {
  const post = POSTS.find((p) => p.id === postId);
  if (!post) throw new Error(`Community post not found: ${postId}`);
  return post;
}

export class CommunityMockDatasource implements ICommunityRepository {
  async getFeed(email: string): Promise<CommunityPost[]> {
    await delay(200);
    return POSTS.map((post) => toPublic(post, email));
  }

  async createPost(email: string, body: string): Promise<CommunityPost> {
    await delay(200);
    // Mismo criterio que el backend: el autor sale de quién es el socio, no
    // de lo que mande el caller.
    const profile = await new UserMockDatasource().getProfile(email);
    const post: StoredPost = {
      id: `post-${Date.now()}`,
      authorName: profile.name,
      authorBranch: profile.branch,
      body,
      createdAt: new Date().toISOString(),
      likedBy: new Set(),
      comments: [],
    };
    POSTS.unshift(post);
    return toPublic(post, email);
  }

  async toggleLike(email: string, postId: string): Promise<CommunityPost> {
    await delay(120);
    const post = findPost(postId);
    if (post.likedBy.has(email)) {
      post.likedBy.delete(email);
    } else {
      post.likedBy.add(email);
    }
    return toPublic(post, email);
  }

  async addComment(email: string, postId: string, body: string): Promise<CommunityPost> {
    await delay(150);
    const post = findPost(postId);
    const profile = await new UserMockDatasource().getProfile(email);
    post.comments = [...post.comments, { id: `comment-${Date.now()}`, authorName: profile.name, body, createdAt: new Date().toISOString() }];
    return toPublic(post, email);
  }
}
