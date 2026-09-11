import { NextResponse } from 'next/server';
import { communityRepository } from '@/lib/repositories/community.repository';
import { userRepository } from '@/lib/repositories/user.repository';
import { getCurrentUserEmail } from '@/lib/session';

// authorName/authorBranch se resuelven aquí a partir de la sesión, nunca del
// body del request — un backend real haría lo mismo (join con el usuario
// autenticado), no confiaría el nombre del autor al cliente.
export async function POST(request: Request) {
  const email = await getCurrentUserEmail();
  if (!email) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { body } = (await request.json()) as { body: string };
  const profile = await userRepository.getProfile(email);
  const post = await communityRepository.createPost(email, profile.name, profile.branch, body);
  return NextResponse.json(post);
}
