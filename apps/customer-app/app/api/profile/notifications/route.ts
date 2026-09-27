import { NextResponse } from 'next/server';
import type { NotificationPreferences } from '@mucho-loco/types';
import { userRepository } from '@/lib/repositories/user.repository';
import { getCurrentUserEmail } from '@/lib/session';

// Guardar los interruptores de avisos de Configuración (spec 053). Aquí y no
// en el navegador: la cookie de sesión solo se lee en el servidor. El
// middleware no cubre /api/*: esta ruta valida sesión sola.
export async function PUT(request: Request) {
  const email = await getCurrentUserEmail();
  if (!email) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  // Las tres categorías, booleanas; solo esas viajan al backend.
  const raw = (await request.json().catch(() => null)) as Partial<Record<keyof NotificationPreferences, unknown>> | null;
  const { membership, orders, payments } = raw ?? {};
  if (typeof membership !== 'boolean' || typeof orders !== 'boolean' || typeof payments !== 'boolean') {
    return NextResponse.json({ error: 'INVALID_PREFERENCES' }, { status: 400 });
  }

  return NextResponse.json(await userRepository.updateNotificationPreferences(email, { membership, orders, payments }));
}
