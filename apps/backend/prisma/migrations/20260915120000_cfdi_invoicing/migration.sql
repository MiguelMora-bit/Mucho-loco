-- Facturación CFDI 4.0, paso 2: datos fiscales del socio, recibos de
-- Facturapi (que son también la cola hacia el PAC) y CFDI timbrados. Ver
-- "Facturación CFDI" en apps/backend/CLAUDE.md.
--
-- Sin backfill: los cobros anteriores no tienen recibo. Darlos de alta hoy
-- los fecharía en este mes, y su ingreso ya pertenece a otro periodo.

-- CreateEnum
CREATE TYPE "FiscalReceiptStatus" AS ENUM ('pending', 'open', 'invoiced_to_customer', 'invoiced_globally', 'canceled', 'failed');

-- CreateEnum
CREATE TYPE "CfdiKind" AS ENUM ('individual', 'global');

-- CreateEnum
CREATE TYPE "CfdiStatus" AS ENUM ('valid', 'canceled');

-- CreateTable
CREATE TABLE "fiscal_profiles" (
    "userId" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "taxSystem" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "cfdiUse" TEXT NOT NULL DEFAULT 'G03',
    "email" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "fiscal_receipts" (
    "chargeId" TEXT NOT NULL,
    "status" "FiscalReceiptStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "facturapiId" TEXT,
    "key" TEXT,
    "selfInvoiceUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "cfdiId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_receipts_pkey" PRIMARY KEY ("chargeId")
);

-- CreateTable
CREATE TABLE "cfdis" (
    "id" TEXT NOT NULL,
    "facturapiId" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "kind" "CfdiKind" NOT NULL,
    "status" "CfdiStatus" NOT NULL DEFAULT 'valid',
    "cancellationStatus" TEXT NOT NULL DEFAULT 'none',
    "totalCents" INTEGER NOT NULL,
    "customerTaxId" TEXT NOT NULL,
    "customerLegalName" TEXT NOT NULL,
    "userId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cfdis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_receipts_facturapiId_key" ON "fiscal_receipts"("facturapiId");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_receipts_key_key" ON "fiscal_receipts"("key");

-- CreateIndex
CREATE INDEX "fiscal_receipts_status_nextAttemptAt_idx" ON "fiscal_receipts"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "fiscal_receipts_cfdiId_idx" ON "fiscal_receipts"("cfdiId");

-- CreateIndex
CREATE UNIQUE INDEX "cfdis_facturapiId_key" ON "cfdis"("facturapiId");

-- CreateIndex
CREATE UNIQUE INDEX "cfdis_uuid_key" ON "cfdis"("uuid");

-- CreateIndex
CREATE INDEX "cfdis_issuedAt_idx" ON "cfdis"("issuedAt");

-- CreateIndex
CREATE INDEX "cfdis_userId_idx" ON "cfdis"("userId");

-- AddForeignKey
ALTER TABLE "fiscal_profiles" ADD CONSTRAINT "fiscal_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_receipts" ADD CONSTRAINT "fiscal_receipts_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "charges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_receipts" ADD CONSTRAINT "fiscal_receipts_cfdiId_fkey" FOREIGN KEY ("cfdiId") REFERENCES "cfdis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cfdis" ADD CONSTRAINT "cfdis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

