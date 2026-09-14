-- AlterTable
ALTER TABLE "memberships" ADD COLUMN     "stripeSubscriptionId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateTable
CREATE TABLE "membership_purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" INTEGER NOT NULL,
    "tierKey" "TierKey" NOT NULL,
    "periodKey" "PlanKey" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'mxn',
    "provider" "PaymentProvider" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "providerSessionId" TEXT NOT NULL,
    "providerSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "membership_purchases_providerSessionId_key" ON "membership_purchases"("providerSessionId");

-- CreateIndex
CREATE INDEX "membership_purchases_userId_idx" ON "membership_purchases"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_stripeSubscriptionId_key" ON "memberships"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "users"("stripeCustomerId");

-- AddForeignKey
ALTER TABLE "membership_purchases" ADD CONSTRAINT "membership_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_purchases" ADD CONSTRAINT "membership_purchases_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
