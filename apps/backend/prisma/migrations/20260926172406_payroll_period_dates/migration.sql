-- Spec 050: las quincenas son fechas solas, y dos no pueden empezar el mismo día.
-- AlterTable
ALTER TABLE "payroll_periods" ALTER COLUMN "startDate" SET DATA TYPE DATE,
ALTER COLUMN "endDate" SET DATA TYPE DATE;

-- CreateIndex
CREATE UNIQUE INDEX "payroll_periods_startDate_key" ON "payroll_periods"("startDate");
