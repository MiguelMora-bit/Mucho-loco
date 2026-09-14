import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import type { BranchSalesReport, BranchStatsSummary } from '@mucho-loco/types';
import { ReportsService, DEFAULT_STATS_WINDOW_DAYS } from './reports.service';
import { Roles } from '../auth/roles.decorator';

@Controller()
export class ReportsController {
  constructor(private reports: ReportsService) {}

  /** Reporte de UNA sucursal — del gerente, no de mostrador. */
  @Roles('manager')
  @Get('branches/:branchId/reports/sales')
  getSalesReport(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ): Promise<BranchSalesReport> {
    return this.reports.getSalesReport(branchId, days);
  }

  /** Las 15 sucursales a la vez — solo el dueño. */
  @Roles('owner')
  @Get('stats/branches')
  getBranchStats(
    @Query('days', new DefaultValuePipe(DEFAULT_STATS_WINDOW_DAYS), ParseIntPipe) days: number,
  ): Promise<BranchStatsSummary[]> {
    return this.reports.getBranchStats(days);
  }
}
