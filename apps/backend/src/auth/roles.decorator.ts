import { SetMetadata } from '@nestjs/common';

/** Grupos de Cognito. Su ausencia en el token implica rol `customer` (ver CLAUDE.md raíz). */
export type StaffRole = 'staff' | 'manager' | 'owner';

export const ROLES_KEY = 'roles';

/**
 * Restringe una ruta a ciertos grupos de Cognito.
 *
 * Sin este decorador una ruta solo pide estar autenticado — que es lo correcto
 * para `/users/me` (cualquier socio ve LO SUYO), pero no para nómina o
 * transferencias de inventario, donde el dato es de toda la cadena y un
 * empleado de mostrador no tiene por qué verlo.
 */
export const Roles = (...roles: StaffRole[]) => SetMetadata(ROLES_KEY, roles);
