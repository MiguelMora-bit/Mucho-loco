import type { CommunityPost } from '@mucho-loco/types';
import { CommunityMockDatasource } from '../datasources/mock/community.mock';
import { CommunityHttpDatasource } from '../datasources/http/community.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

export interface ICommunityRepository {
  getFeed(email: string): Promise<CommunityPost[]>;
  /**
   * El autor (nombre y sucursal) NO es un parámetro: lo resuelve quien
   * implementa este contrato a partir de la identidad del socio — el mock
   * desde su propio registro, el datasource HTTP desde el ID token que
   * verifica el backend. Antes venía del caller, y eso dejaba firmar un post
   * con el nombre de otra persona (ver CommunityController).
   */
  createPost(email: string, body: string): Promise<CommunityPost>;
  toggleLike(email: string, postId: string): Promise<CommunityPost>;
  addComment(email: string, postId: string, body: string): Promise<CommunityPost>;
}

export const communityRepository: ICommunityRepository = isHttpDatasourceEnabled()
  ? new CommunityHttpDatasource()
  : new CommunityMockDatasource();
