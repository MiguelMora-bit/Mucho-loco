import type { CommunityPost } from '@mucho-loco/types';
import { CommunityMockDatasource } from '../datasources/mock/community.mock';

export interface ICommunityRepository {
  getFeed(email: string): Promise<CommunityPost[]>;
  createPost(email: string, authorName: string, authorBranch: string, body: string): Promise<CommunityPost>;
  toggleLike(email: string, postId: string): Promise<CommunityPost>;
  addComment(email: string, authorName: string, postId: string, body: string): Promise<CommunityPost>;
}

// Swap this line to plug in a real API datasource
export const communityRepository: ICommunityRepository = new CommunityMockDatasource();
