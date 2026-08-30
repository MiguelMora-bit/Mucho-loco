import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '../../../../lib/auth';

export async function POST(request: Request) {
  const { email, name } = await request.json() as { email?: string; name?: string };

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, email || 'usuario', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return response;
}
