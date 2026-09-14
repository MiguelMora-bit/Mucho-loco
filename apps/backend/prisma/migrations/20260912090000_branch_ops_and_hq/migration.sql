-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'card', 'transfer');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('rent', 'utilities', 'maintenance', 'supplies', 'marketing', 'other');

-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('manager', 'counter', 'coach');

-- CreateEnum
CREATE TYPE "PayrollPeriodStatus" AS ENUM ('open', 'closed');

-- AlterTable
ALTER TABLE "memberships" ADD COLUMN     "fingerprintId" TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "cognitoSub" DROP NOT NULL;

-- CreateTable
CREATE TABLE "branch_inventory" (
    "branchId" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "branch_inventory_pkey" PRIMARY KEY ("branchId","productId")
);

-- CreateTable
CREATE TABLE "counter_sales" (
    "id" TEXT NOT NULL,
    "branchId" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "counter_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counter_sale_items" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,

    CONSTRAINT "counter_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_register_shifts" (
    "id" TEXT NOT NULL,
    "branchId" INTEGER NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "status" "ShiftStatus" NOT NULL DEFAULT 'open',

    CONSTRAINT "cash_register_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_payments" (
    "id" TEXT NOT NULL,
    "branchId" INTEGER NOT NULL,
    "membershipId" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "tierKey" "TierKey" NOT NULL,
    "periodKey" "PlanKey" NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "isNewMember" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "branchId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "EmployeeRole" NOT NULL,
    "dailyRate" INTEGER NOT NULL,
    "hireDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_entries" (
    "id" TEXT NOT NULL,
    "branchId" INTEGER NOT NULL,
    "employeeId" TEXT,
    "staffEmail" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "clockIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clockOut" TIMESTAMP(3),

    CONSTRAINT "attendance_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transfers" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fromBranchId" INTEGER NOT NULL,
    "toBranchId" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "branchId" INTEGER,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_periods" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'open',

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslips" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "branchId" INTEGER NOT NULL,
    "role" "EmployeeRole" NOT NULL,
    "daysWorked" INTEGER NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "dailyRate" INTEGER NOT NULL,
    "grossPay" INTEGER NOT NULL,
    "isrDeduction" INTEGER NOT NULL,
    "imssDeduction" INTEGER NOT NULL,
    "netPay" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "counter_sales_branchId_createdAt_idx" ON "counter_sales"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "cash_register_shifts_branchId_openedAt_idx" ON "cash_register_shifts"("branchId", "openedAt");

-- CreateIndex
CREATE INDEX "membership_payments_branchId_createdAt_idx" ON "membership_payments"("branchId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE INDEX "attendance_entries_branchId_clockIn_idx" ON "attendance_entries"("branchId", "clockIn");

-- CreateIndex
CREATE INDEX "attendance_entries_staffEmail_clockIn_idx" ON "attendance_entries"("staffEmail", "clockIn");

-- CreateIndex
CREATE INDEX "inventory_transfers_createdAt_idx" ON "inventory_transfers"("createdAt");

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_periodId_employeeId_key" ON "payslips"("periodId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_fingerprintId_key" ON "memberships"("fingerprintId");

-- AddForeignKey
ALTER TABLE "branch_inventory" ADD CONSTRAINT "branch_inventory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_inventory" ADD CONSTRAINT "branch_inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counter_sales" ADD CONSTRAINT "counter_sales_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counter_sale_items" ADD CONSTRAINT "counter_sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "counter_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_register_shifts" ADD CONSTRAINT "cash_register_shifts_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_payments" ADD CONSTRAINT "membership_payments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_payments" ADD CONSTRAINT "membership_payments_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_entries" ADD CONSTRAINT "attendance_entries_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_entries" ADD CONSTRAINT "attendance_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_fromBranchId_fkey" FOREIGN KEY ("fromBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_toBranchId_fkey" FOREIGN KEY ("toBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Índices únicos PARCIALES: Prisma no sabe declararlos en schema.prisma, pero
-- sin ellos los dos invariantes de más abajo solo viven en el código del
-- service, y dos requests simultáneos podrían romperlos.

-- A lo más UN turno de caja abierto por sucursal.
CREATE UNIQUE INDEX "cash_register_shifts_one_open_per_branch"
  ON "cash_register_shifts" ("branchId")
  WHERE "status" = 'open';

-- A lo más UNA entrada de asistencia abierta por empleado.
CREATE UNIQUE INDEX "attendance_entries_one_open_per_staff"
  ON "attendance_entries" ("staffEmail")
  WHERE "clockOut" IS NULL;
