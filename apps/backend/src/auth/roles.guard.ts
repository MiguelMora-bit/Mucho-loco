import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from './cognito-auth.guard';
import { ROLES_KEY, type StaffRole } from './roles.decorator';

/**
 * Corre DESPUÉS de CognitoAuthGuard (el orden de APP_GUARD en AppModule es el
 * orden de ejecución), así que `request.user` ya está verificado — este guard
 * solo decide, nunca autentica.
 *
 * 'owner' pasa cualquier ruta de staff: el dueño puede hacer todo lo que hace
 * un gerente, y un gerente todo lo de mostrador. Modelarlo como jerarquía y no
 * como lista exacta evita tener que escribir @Roles('staff','manager','owner')
 * en cada endpoint de sucursal y olvidarse de uno.
 */
const RANK: Record<StaffRole, number> = { staff: 1, manager: 2, owner: 3 };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<StaffRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const groups = request.user?.groups ?? [];
    const highest = Math.max(
      0,
      ...groups.map((g) => RANK[g as StaffRole] ?? 0),
    );
    const needed = Math.min(...required.map((r) => RANK[r]));

    if (highest < needed) {
      throw new ForbiddenException(
        `Requiere rol ${required.join(' o ')} — el token no lo trae`,
      );
    }
    return true;
  }
}
