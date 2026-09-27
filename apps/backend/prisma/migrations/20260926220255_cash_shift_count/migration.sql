-- Spec 052: arqueo congelado al cerrar el turno, para que HQ audite los cortes.
-- AlterTable
ALTER TABLE "cash_register_shifts" ADD COLUMN     "cardTotal" INTEGER,
ADD COLUMN     "cashTotal" INTEGER,
ADD COLUMN     "closedByEmail" TEXT,
ADD COLUMN     "closedByName" TEXT,
ADD COLUMN     "countedCash" INTEGER,
ADD COLUMN     "transactionCount" INTEGER,
ADD COLUMN     "transferTotal" INTEGER;

-- CreateIndex
CREATE INDEX "cash_register_shifts_status_closedAt_idx" ON "cash_register_shifts"("status", "closedAt");
