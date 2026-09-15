-- Registro de cobros (paso 1 de facturación). Ver "Registro de cobros" en
-- apps/backend/CLAUDE.md.

-- CreateEnum
CREATE TYPE "ChargeSource" AS ENUM ('order', 'counter_sale', 'counter_membership', 'membership_visit', 'membership_subscription');

-- CreateEnum
CREATE TYPE "ChargeMethod" AS ENUM ('cash', 'card', 'card_credit', 'card_debit', 'oxxo', 'spei', 'transfer');

-- CreateTable
CREATE TABLE "tax_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "satProductKey" TEXT NOT NULL,
    "satUnitKey" TEXT NOT NULL,
    "taxRateBp" INTEGER NOT NULL,

    CONSTRAINT "tax_categories_pkey" PRIMARY KEY ("id")
);

-- Las categorías van en la migración y no solo en el seed: products y
-- membership_tiers ya tienen filas, y su nueva columna es NOT NULL. Mismas
-- filas que prisma/seed.ts (que las vuelve a upsertear).
--
-- 01010101 ("No existe en el catálogo") es una clave válida del SAT pero
-- genérica: la clave real de cada categoría la define el contador antes de
-- emitir la primera factura.
INSERT INTO "tax_categories" ("id", "name", "satProductKey", "satUnitKey", "taxRateBp") VALUES
    ('supplement',     'Suplementos alimenticios', '01010101', 'H87', 1600),
    ('energy_drink',   'Bebidas energizantes',     '01010101', 'H87', 1600),
    ('beverage',       'Agua y bebidas',           '01010101', 'H87', 1600),
    ('merch',          'Mercancía',                '01010101', 'H87', 1600),
    ('gym_membership', 'Membresía de gimnasio',    '01010101', 'E48', 1600),
    ('shipping',       'Envío a domicilio',        '01010101', 'E48', 1600),
    ('unclassified',   'Sin clasificar',           '01010101', 'H87', 1600);

-- AlterTable: nullable, se llena por categoría del catálogo, y luego NOT NULL.
ALTER TABLE "products" ADD COLUMN "taxCategoryId" TEXT;
UPDATE "products" SET "taxCategoryId" = CASE "cat"
    WHEN 'proteinas' THEN 'supplement'
    WHEN 'pre'       THEN 'supplement'
    WHEN 'gomitas'   THEN 'supplement'
    WHEN 'energy'    THEN 'energy_drink'
    WHEN 'agua'      THEN 'beverage'
    WHEN 'merch'     THEN 'merch'
END;
ALTER TABLE "products" ALTER COLUMN "taxCategoryId" SET NOT NULL;

-- AlterTable
ALTER TABLE "membership_tiers" ADD COLUMN "taxCategoryId" TEXT;
UPDATE "membership_tiers" SET "taxCategoryId" = 'gym_membership';
ALTER TABLE "membership_tiers" ALTER COLUMN "taxCategoryId" SET NOT NULL;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "productId" TEXT,
ADD COLUMN     "unitPrice" INTEGER;

-- CreateTable
CREATE TABLE "charges" (
    "id" TEXT NOT NULL,
    "source" "ChargeSource" NOT NULL,
    "method" "ChargeMethod" NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'mxn',
    "paidAt" TIMESTAMP(3) NOT NULL,
    "branchId" INTEGER,
    "userId" TEXT,
    "orderId" TEXT,
    "counterSaleId" TEXT,
    "membershipPaymentId" TEXT,
    "membershipPurchaseId" TEXT,
    "stripeInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge_lines" (
    "id" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "taxCategoryId" TEXT NOT NULL,
    "satProductKey" TEXT NOT NULL,
    "satUnitKey" TEXT NOT NULL,
    "taxRateBp" INTEGER NOT NULL,

    CONSTRAINT "charge_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "charges_orderId_key" ON "charges"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "charges_counterSaleId_key" ON "charges"("counterSaleId");

-- CreateIndex
CREATE UNIQUE INDEX "charges_membershipPaymentId_key" ON "charges"("membershipPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "charges_membershipPurchaseId_key" ON "charges"("membershipPurchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "charges_stripeInvoiceId_key" ON "charges"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "charges_paidAt_idx" ON "charges"("paidAt");

-- CreateIndex
CREATE INDEX "charges_branchId_paidAt_idx" ON "charges"("branchId", "paidAt");

-- CreateIndex
CREATE INDEX "charge_lines_chargeId_idx" ON "charge_lines"("chargeId");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_taxCategoryId_fkey" FOREIGN KEY ("taxCategoryId") REFERENCES "tax_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_tiers" ADD CONSTRAINT "membership_tiers_taxCategoryId_fkey" FOREIGN KEY ("taxCategoryId") REFERENCES "tax_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_counterSaleId_fkey" FOREIGN KEY ("counterSaleId") REFERENCES "counter_sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_membershipPaymentId_fkey" FOREIGN KEY ("membershipPaymentId") REFERENCES "membership_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_membershipPurchaseId_fkey" FOREIGN KEY ("membershipPurchaseId") REFERENCES "membership_purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_lines" ADD CONSTRAINT "charge_lines_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "charges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Invariante escrito a mano (Prisma no sabe declarar CHECKs): un cobro viene
-- de exactamente UN origen. Sin él, un bug podría registrar un cobro sin
-- origen (dinero que nadie sabe de dónde salió) o ligado a dos.
ALTER TABLE "charges" ADD CONSTRAINT "charges_exactly_one_source" CHECK (
    num_nonnulls("orderId", "counterSaleId", "membershipPaymentId", "membershipPurchaseId", "stripeInvoiceId") = 1
);
