-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('credit', 'debit');

-- AlterTable
ALTER TABLE "counter_sales" ADD COLUMN     "cardType" "CardType";

-- AlterTable
ALTER TABLE "membership_payments" ADD COLUMN     "cardType" "CardType";
