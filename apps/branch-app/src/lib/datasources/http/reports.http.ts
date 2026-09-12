import type { BranchSalesReport } from '@mucho-loco/types';
import type { IReportsRepository } from '../../repositories/reports.repository';
import { api } from './client';

/**
 * Reporte del gerente.
 *
 * El mock traía TODAS las ventas al navegador y sumaba ahí
 * (`calculateSalesReport` en `lib/reports.ts`). El backend hace la misma
 * cuenta contra la base y manda solo el resultado — esa función pura se queda
 * viva porque la usa el mock, pero deja de correr en producción.
 */
export class ReportsHttpDatasource implements IReportsRepository {
  getSalesReport(branchId: number, days: number): Promise<BranchSalesReport> {
    return api.get<BranchSalesReport>(`/branches/${branchId}/reports/sales`, {
      query: { days },
    });
  }
}
