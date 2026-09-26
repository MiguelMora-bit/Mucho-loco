import { Controller, Get, Param, Post } from '@nestjs/common';
import type { AttendanceSummary, Employee, PayrollPeriod, Payslip } from '@mucho-loco/types';
import { PayrollService } from './payroll.service';
import { Roles } from '../auth/roles.decorator';

/** Nómina: solo el dueño. Un gerente ve su sucursal, no los sueldos de la cadena. */
@Controller('payroll')
@Roles('owner')
export class PayrollController {
  constructor(private payroll: PayrollService) {}

  @Get('employees')
  getEmployees(): Promise<Employee[]> {
    return this.payroll.getEmployees();
  }

  @Get('periods')
  getPeriods(): Promise<PayrollPeriod[]> {
    return this.payroll.getPeriods();
  }

  @Get('attendance')
  getAttendance(): Promise<AttendanceSummary[]> {
    return this.payroll.getAttendanceSummaries();
  }

  @Get('payslips')
  getPayslips(): Promise<Payslip[]> {
    return this.payroll.getPayslips();
  }

  @Post('periods/next')
  openNextPeriod(): Promise<PayrollPeriod> {
    return this.payroll.openNextPeriod();
  }

  @Post('periods/:periodId/run')
  runPayroll(@Param('periodId') periodId: string): Promise<Payslip[]> {
    return this.payroll.runPayroll(periodId);
  }
}
