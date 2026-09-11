import { NextResponse } from 'next/server';
import { communityRepository } from '@/lib/repositories/community.repository';
import { getCurrentUserEmail } from '@/lib/session';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = await getCurrentUserEmail();
  if (!email) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { id } = await params;
  const post = await communityRepository.toggleLike(email, id);
  return NextResponse.json(post);
}
