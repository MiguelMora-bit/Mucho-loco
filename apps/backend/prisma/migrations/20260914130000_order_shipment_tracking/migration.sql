-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'shipped';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "trackingNumber" TEXT;
