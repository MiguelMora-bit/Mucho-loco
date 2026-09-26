-- Spec 020: el mismo QR entró el mismo día en otra sucursal. Mostrador lo ve
-- en el momento; esta tabla es para que HQ lo revise después.

-- CreateTable
CREATE TABLE "access_alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" INTEGER NOT NULL,
    "firstBranchId" INTEGER NOT NULL,
    "firstAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_alerts_createdAt_idx" ON "access_alerts"("createdAt");

-- AddForeignKey
ALTER TABLE "access_alerts" ADD CONSTRAINT "access_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_alerts" ADD CONSTRAINT "access_alerts_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_alerts" ADD CONSTRAINT "access_alerts_firstBranchId_fkey" FOREIGN KEY ("firstBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

