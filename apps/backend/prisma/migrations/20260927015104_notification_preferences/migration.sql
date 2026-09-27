-- Spec 053: qué avisos de WhatsApp quiere cada socio. Prendidos por default.
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notifyMembership" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyOrders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyPayments" BOOLEAN NOT NULL DEFAULT true;
