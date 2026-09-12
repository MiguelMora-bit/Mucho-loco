-- CreateEnum
CREATE TYPE "BranchTier" AS ENUM ('Lite', 'Core', 'Premium');

-- CreateEnum
CREATE TYPE "TierKey" AS ENUM ('single', 'all');

-- CreateEnum
CREATE TYPE "PlanKey" AS ENUM ('visit', 'weekly', 'monthly', 'quarterly', 'annual');

-- CreateEnum
CREATE TYPE "AccessStatus" AS ENUM ('active', 'grace', 'expired');

-- CreateEnum
CREATE TYPE "ProductCat" AS ENUM ('proteinas', 'pre', 'energy', 'gomitas', 'agua', 'merch');

-- CreateEnum
CREATE TYPE "OnlinePaymentMethod" AS ENUM ('card', 'transfer', 'mercadopago', 'stripe', 'paypal', 'cash');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('pickup', 'home');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('ready', 'done');

-- CreateTable
CREATE TABLE "branches" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "addr" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "classes" INTEGER NOT NULL,
    "coaches" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "tier" "BranchTier" NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "promo" JSONB,
    "hours" TEXT NOT NULL,
    "img" TEXT NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "cat" "ProductCat" NOT NULL,
    "name" JSONB NOT NULL,
    "flav" JSONB NOT NULL,
    "price" INTEGER NOT NULL,
    "img" TEXT NOT NULL,
    "tag" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_tiers" (
    "key" "TierKey" NOT NULL,
    "name" JSONB NOT NULL,
    "factor" DOUBLE PRECISION NOT NULL,
    "perks" JSONB NOT NULL,
    "badge" JSONB NOT NULL,
    "popular" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "membership_tiers_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "cognitoSub" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "birthdate" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" INTEGER NOT NULL,
    "tierKey" "TierKey" NOT NULL,
    "periodKey" "PlanKey" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "AccessStatus" NOT NULL DEFAULT 'active',
    "graceEndsAt" TIMESTAMP(3),
    "visits" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "accessCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" INTEGER NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'ready',
    "total" INTEGER NOT NULL,
    "paymentMethod" "OnlinePaymentMethod" NOT NULL,
    "delivery" "DeliveryMethod" NOT NULL,
    "branchId" INTEGER,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flav" TEXT NOT NULL,
    "img" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_cognitoSub_key" ON "users"("cognitoSub");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_userId_key" ON "memberships"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_accessCode_key" ON "memberships"("accessCode");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
