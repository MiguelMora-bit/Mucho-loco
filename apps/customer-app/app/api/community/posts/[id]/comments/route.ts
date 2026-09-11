import { NextResponse } from 'next/server';
import { communityRepository } from '@/lib/repositories/community.repository';
import { userRepository } from '@/lib/repositories/user.repository';
import { getCurrentUserEmail } from '@/lib/session';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = await getCurrentUserEmail();
  if (!email) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { id } = await params;
  const { body } = (await request.json()) as { body: string };
  const profile = await userRepository.getProfile(email);
  const post = await communityRepository.addComment(email, profile.name, id, body);
  return NextResponse.json(post);
}
