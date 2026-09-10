export interface StaffBranchAssignment {
  branchId: number;
  branchName: string;
}

// Cognito se mantiene minimal a propósito (identidad + rol vía grupos, ver
// CLAUDE.md raíz) — NO guarda a qué sucursal pertenece cada empleado, eso es
// dato de negocio. Hasta que exista el backend real (tabla de empleados en
// Postgres), este mapeo mock cubre esa asignación — mismo patrón que los
// perfiles por email de customer-app (lib/datasources/mock/user.mock.ts).
const STAFF_DIRECTORY: Record<string, StaffBranchAssignment> = {
  'ana@mucholoco.mx': { branchId: 1, branchName: 'Roma Sur' },
  'luis@mucholoco.mx': { branchId: 1, branchName: 'Roma Sur' },
};

export function lookupStaffBranch(email: string): StaffBranchAssignment | null {
  return STAFF_DIRECTORY[email] ?? null;
}
