import type { CommunityPost } from '@mucho-loco/types';
import type { ICommunityRepository } from '../../repositories/community.repository';
import { apiGet, apiPost } from './client';
import { cookieSessionToken, requireToken, type TokenProvider } from './session-token';

/**
 * Feed interno entre socios (`/community/posts`).
 *
 * `email` se ignora: el backend resuelve al socio (y con él el nombre y la
 * sucursal del autor) desde el ID token, nunca de un dato que el cliente
 * pueda elegir — ver CommunityController.
 */
export class CommunityHttpDatasource implements ICommunityRepository {
  constructor(private readonly getToken: TokenProvider = cookieSessionToken) {}

  private async token(path: string): Promise<string> {
    return requireToken(this.getToken, path);
  }

  async getFeed(_email: string): Promise<CommunityPost[]> {
    return apiGet<CommunityPost[]>('/community/posts', {
      token: await this.token('/community/posts'),
    });
  }

  async createPost(_email: string, body: string): Promise<CommunityPost> {
    const path = '/community/posts';
    return apiPost<CommunityPost>(path, { body }, { token: await this.token(path) });
  }

  async toggleLike(_email: string, postId: string): Promise<CommunityPost> {
    const path = `/community/posts/${postId}/like`;
    return apiPost<CommunityPost>(path, {}, { token: await this.token(path) });
  }

  async addComment(_email: string, postId: string, body: string): Promise<CommunityPost> {
    const path = `/community/posts/${postId}/comments`;
    return apiPost<CommunityPost>(path, { body }, { token: await this.token(path) });
  }
}
