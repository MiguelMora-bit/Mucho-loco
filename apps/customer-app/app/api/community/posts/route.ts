import { NextResponse } from 'next/server';
import { communityRepository } from '@/lib/repositories/community.repository';
import { getCurrentUserEmail } from '@/lib/session';

// El nombre y la sucursal del autor los resuelve el repositorio desde la
// identidad del socio, no este handler ni el body del request — ver
// ICommunityRepository.createPost().
export async function POST(request: Request) {
  const email = await getCurrentUserEmail();
  if (!email) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { body } = (await request.json()) as { body: string };
  const post = await communityRepository.createPost(email, body);
  return NextResponse.json(post);
}
